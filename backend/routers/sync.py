from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.team import TeamMember, SharedCollection, SharedEnvironment

router = APIRouter(prefix="/sync", tags=["sync"])


class SyncCollectionRequest(BaseModel):
    team_id: str
    name: str
    data: str  # JSON string of collection tree


class CollectionResponse(BaseModel):
    id: str
    team_id: str
    name: str
    data: str
    updated_by: str
    updated_at: str


@router.get("/{team_id}/collections", response_model=list[CollectionResponse])
async def list_shared_collections(
    team_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出團隊的所有共享 Collection"""
    user_id = current_user["sub"]

    # 驗證成員資格
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == user_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a team member")

    result = await db.execute(
        select(SharedCollection).where(SharedCollection.team_id == team_id)
    )
    collections = result.scalars().all()

    return [
        CollectionResponse(
            id=c.id,
            team_id=c.team_id,
            name=c.name,
            data=c.data,
            updated_by=c.updated_by,
            updated_at=c.updated_at.isoformat(),
        )
        for c in collections
    ]


@router.post("/collections", response_model=CollectionResponse)
async def sync_collection(
    body: SyncCollectionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """上傳/同步 Collection 到團隊"""
    user_id = current_user["sub"]

    # 驗證成員資格（需要 editor 以上）
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == body.team_id,
            TeamMember.user_id == user_id,
            TeamMember.role.in_(["admin", "editor"]),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Requires editor or owner role")

    collection = SharedCollection(
        team_id=body.team_id,
        name=body.name,
        data=body.data,
        updated_by=user_id,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)

    return CollectionResponse(
        id=collection.id,
        team_id=collection.team_id,
        name=collection.name,
        data=collection.data,
        updated_by=collection.updated_by,
        updated_at=collection.updated_at.isoformat(),
    )


@router.put("/collections/{collection_id}", response_model=CollectionResponse)
async def update_shared_collection(
    collection_id: str,
    body: SyncCollectionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新共享 Collection"""
    user_id = current_user["sub"]

    # 驗證成員資格
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == body.team_id,
            TeamMember.user_id == user_id,
            TeamMember.role.in_(["admin", "editor"]),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Requires editor or owner role")

    result = await db.execute(
        select(SharedCollection).where(SharedCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    collection.name = body.name
    collection.data = body.data
    collection.updated_by = user_id
    collection.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return CollectionResponse(
        id=collection.id,
        team_id=collection.team_id,
        name=collection.name,
        data=collection.data,
        updated_by=collection.updated_by,
        updated_at=collection.updated_at.isoformat(),
    )


@router.delete("/collections/{collection_id}")
async def delete_shared_collection(
    collection_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """刪除共享 Collection（僅 admin）"""
    user_id = current_user["sub"]

    result = await db.execute(
        select(SharedCollection).where(SharedCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # 驗證 admin
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == collection.team_id,
            TeamMember.user_id == user_id,
            TeamMember.role == "admin",
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only admin can delete")

    await db.delete(collection)
    await db.commit()
    return {"message": "Collection deleted"}


# ── Shared Environments ──


class SyncEnvironmentRequest(BaseModel):
    data: str  # JSON string of environments array


class EnvironmentResponse(BaseModel):
    id: str
    team_id: str
    data: str
    updated_by: str
    updated_at: str


@router.get("/{team_id}/environments", response_model=EnvironmentResponse | None)
async def get_shared_environments(
    team_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """取得團隊的共享環境變數"""
    user_id = current_user["sub"]

    # 驗證成員資格
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == user_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a team member")

    result = await db.execute(
        select(SharedEnvironment).where(SharedEnvironment.team_id == team_id)
    )
    env = result.scalar_one_or_none()
    if not env:
        return None

    return EnvironmentResponse(
        id=env.id,
        team_id=env.team_id,
        data=env.data,
        updated_by=env.updated_by,
        updated_at=env.updated_at.isoformat(),
    )


@router.put("/{team_id}/environments", response_model=EnvironmentResponse)
async def update_shared_environments(
    team_id: str,
    body: SyncEnvironmentRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新團隊的共享環境變數（整包覆蓋）"""
    user_id = current_user["sub"]

    # 驗證 editor 以上權限
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
            TeamMember.role.in_(["admin", "editor"]),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Requires editor or admin role")

    # 查找或建立
    result = await db.execute(
        select(SharedEnvironment).where(SharedEnvironment.team_id == team_id)
    )
    env = result.scalar_one_or_none()

    if env:
        env.data = body.data
        env.updated_by = user_id
        env.updated_at = datetime.now(timezone.utc)
    else:
        env = SharedEnvironment(
            team_id=team_id,
            data=body.data,
            updated_by=user_id,
        )
        db.add(env)

    await db.commit()
    await db.refresh(env)

    return EnvironmentResponse(
        id=env.id,
        team_id=env.team_id,
        data=env.data,
        updated_by=env.updated_by,
        updated_at=env.updated_at.isoformat(),
    )
