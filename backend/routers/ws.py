"""WebSocket 即時同步端點 — Collection 即時推送/接收"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import async_session
from backend.core.security import decode_token
from backend.core.ws_manager import manager
from backend.models.team import TeamMember, SharedCollection

router = APIRouter(tags=["websocket"])


async def verify_ws_token(token: str) -> dict | None:
    """驗證 WebSocket 連線的 JWT token"""
    try:
        return decode_token(token)
    except Exception:
        return None


async def verify_team_member(user_id: str, team_id: str, db: AsyncSession) -> bool:
    """驗證使用者是否為團隊成員"""
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def get_member_role(user_id: str, team_id: str, db: AsyncSession) -> str | None:
    """取得使用者在團隊中的角色"""
    result = await db.execute(
        select(TeamMember.role).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    row = result.scalar_one_or_none()
    return row


@router.websocket("/ws/sync/{team_id}")
async def websocket_sync(websocket: WebSocket, team_id: str, token: str = Query(...)):
    """
    WebSocket 即時同步端點

    連線方式：ws://host/ws/sync/{team_id}?token=JWT_TOKEN
    """
    # 1. 驗證 JWT
    user = await verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = user["sub"]
    user_name = user.get("name", "Unknown")

    # 2. 驗證團隊成員資格
    async with async_session() as db:
        is_member = await verify_team_member(user_id, team_id, db)
        if not is_member:
            await websocket.close(code=4003, reason="Not a team member")
            return

    # 3. 加入連線管理器
    await manager.connect(team_id, websocket, user_id)
    print(f"[WS] {user_name} connected to team {team_id} (online: {manager.get_online_count(team_id)})")

    try:
        while True:
            # 接收 client 訊息
            raw = await websocket.receive_text()

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error", "message": "Invalid JSON"
                }))
                continue

            msg_type = msg.get("type")

            if msg_type == "collection_update":
                # Client 推送 collection 更新
                await handle_collection_update(
                    team_id=team_id,
                    user_id=user_id,
                    data=msg.get("data", "[]"),
                    name=msg.get("name", "Untitled"),
                    websocket=websocket,
                )

            elif msg_type == "ping":
                # 心跳回應
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error for {user_name} in team {team_id}: {e}")
    finally:
        manager.disconnect(team_id, websocket)
        print(f"[WS] {user_name} disconnected from team {team_id} (online: {manager.get_online_count(team_id)})")


async def handle_collection_update(
    team_id: str,
    user_id: str,
    data: str,
    name: str,
    websocket: WebSocket,
):
    """處理 collection 更新：寫入 DB + 廣播給同 team 其他人"""
    async with async_session() as db:
        # 驗證寫入權限（需要 editor 以上）
        role = await get_member_role(user_id, team_id, db)
        if role not in ("owner", "editor"):
            await websocket.send_text(json.dumps({
                "type": "error", "message": "Requires editor or owner role"
            }))
            return

        # 查找或建立 SharedCollection
        result = await db.execute(
            select(SharedCollection).where(SharedCollection.team_id == team_id)
        )
        collection = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if collection:
            collection.name = name
            collection.data = data
            collection.updated_by = user_id
            collection.updated_at = now
        else:
            collection = SharedCollection(
                team_id=team_id,
                name=name,
                data=data,
                updated_by=user_id,
            )
            db.add(collection)

        await db.commit()

    # 回應發送者：確認成功
    await websocket.send_text(json.dumps({
        "type": "sync_ok", "timestamp": now.isoformat()
    }))

    # 廣播給同 team 其他人
    await manager.broadcast(
        team_id,
        {
            "type": "collection_updated",
            "data": data,
            "name": name,
            "updated_by": user_id,
            "timestamp": now.isoformat(),
        },
        exclude_ws=websocket,
    )
