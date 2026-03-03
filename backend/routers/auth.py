from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from backend.core.config import settings
from backend.core.database import get_db
from backend.core.security import create_access_token
from backend.models.user import User
from backend.models.team import TeamMember, PendingInvitation
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleTokenRequest(BaseModel):
    """從前端 Tauri 取得的 Google OAuth token"""
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/google", response_model=TokenResponse)
async def google_login(body: GoogleTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    用 Google id_token 驗證並登入/註冊
    Tauri 前端透過 OAuth 取得 id_token 後呼叫此 API
    """
    import traceback
    from fastapi import HTTPException

    # 驗證 Google id_token
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={body.id_token}"
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        google_user = resp.json()

    # 驗證 audience（防止其他 App 的 id_token 被偷用）
    if google_user.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Invalid token audience")

    try:
        google_id = google_user["sub"]
        email = google_user["email"]
        name = google_user.get("name", email)
        picture = google_user.get("picture")

        # 查找或建立使用者
        result = await db.execute(select(User).where(User.google_id == google_id))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                email=email,
                name=name,
                picture=picture,
                google_id=google_id,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # 更新 name / picture
            user.name = name
            user.picture = picture
            await db.commit()

        # 處理 pending invitations：自動加入被邀請的團隊
        result = await db.execute(
            select(PendingInvitation).where(PendingInvitation.email == user.email)
        )
        pending_list = result.scalars().all()
        joined_teams = 0
        for inv in pending_list:
            member = TeamMember(team_id=inv.team_id, user_id=user.id, role=inv.role)
            db.add(member)
            await db.delete(inv)
            joined_teams += 1
        if joined_teams > 0:
            await db.commit()

        # 產生 JWT
        token = create_access_token({"sub": user.id, "email": user.email, "name": user.name})

        return TokenResponse(
            access_token=token,
            user={
                "id": user.id, "email": user.email, "name": user.name, "picture": user.picture,
                "joined_teams": joined_teams,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH ERROR] {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")
