from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.team import Team, TeamMember, PendingInvitation

router = APIRouter(prefix="/teams", tags=["teams"])


class CreateTeamRequest(BaseModel):
    name: str


class InviteMemberRequest(BaseModel):
    email: str
    role: str = "viewer"  # viewer / editor / admin


class TeamResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    role: str
    members: list[dict] = []


@router.get("/", response_model=list[TeamResponse])
async def list_teams(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出使用者所屬的所有團隊"""
    user_id = current_user["sub"]
    result = await db.execute(
        select(TeamMember, Team)
        .join(Team, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == user_id)
    )
    teams = []
    for member, team in result.all():
        teams.append(TeamResponse(
            id=team.id, name=team.name, owner_id=team.owner_id, role=member.role,
        ))
    return teams


@router.post("/", response_model=TeamResponse)
async def create_team(
    body: CreateTeamRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """建立團隊（建立者自動成為 admin）"""
    import traceback
    user_id = current_user["sub"]
    try:
        team = Team(name=body.name, owner_id=user_id)
        db.add(team)
        await db.flush()

        member = TeamMember(team_id=team.id, user_id=user_id, role="admin")
        db.add(member)
        await db.commit()

        return TeamResponse(id=team.id, name=team.name, owner_id=team.owner_id, role="admin")
    except Exception as e:
        print(f"[TEAM CREATE ERROR] {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")


@router.get("/{team_id}/members")
async def list_members(
    team_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出團隊所有成員 + pending 邀請（僅團隊成員可查看）"""
    user_id = current_user["sub"]

    # 驗證呼叫者是團隊成員
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == user_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a team member")

    # 查詢所有成員 + 使用者資料
    from backend.models.user import User
    result = await db.execute(
        select(TeamMember, User)
        .join(User, TeamMember.user_id == User.id)
        .where(TeamMember.team_id == team_id)
    )
    members = []
    for tm, user in result.all():
        members.append({
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "role": tm.role,
            "status": "active",
        })

    # 查詢 pending 邀請
    result = await db.execute(
        select(PendingInvitation).where(PendingInvitation.team_id == team_id)
    )
    for inv in result.scalars().all():
        members.append({
            "user_id": inv.id,  # 用 invitation id 作為識別
            "email": inv.email,
            "name": inv.email,  # 尚未註冊，用 email 顯示
            "role": inv.role,
            "status": "pending",
        })

    return members


@router.post("/{team_id}/invite")
async def invite_member(
    team_id: str,
    body: InviteMemberRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """邀請成員加入團隊（僅 admin 可操作，未註冊用戶也可邀請）"""
    user_id = current_user["sub"]

    # 驗證角色合法性
    if body.role not in ("viewer", "editor", "admin"):
        raise HTTPException(status_code=400, detail="Role must be viewer, editor, or admin")

    # 驗證權限（需要 admin）
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
            TeamMember.role == "admin",
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only admin can invite members")

    # 查找受邀者（透過 email 找 user，忽略大小寫）
    from backend.models.user import User
    result = await db.execute(select(User).where(func.lower(User.email) == body.email.lower()))
    invitee = result.scalar_one_or_none()

    if invitee:
        # 使用者已註冊 → 直接加入團隊
        result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id, TeamMember.user_id == invitee.id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="User already in team")

        member = TeamMember(team_id=team_id, user_id=invitee.id, role=body.role)
        db.add(member)
        await db.commit()
        return {"message": f"Invited {body.email} as {body.role}"}
    else:
        # 使用者未註冊 → 建立 pending invitation
        result = await db.execute(
            select(PendingInvitation).where(
                PendingInvitation.team_id == team_id,
                func.lower(PendingInvitation.email) == body.email.lower(),
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Invitation already sent")

        invitation = PendingInvitation(
            team_id=team_id,
            email=body.email.lower(),
            role=body.role,
            invited_by=user_id,
        )
        db.add(invitation)
        await db.commit()
        return {"message": f"Invitation sent to {body.email} (pending registration)"}


@router.delete("/{team_id}/members/{member_user_id}")
async def remove_member(
    team_id: str,
    member_user_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """移除成員、取消 pending 邀請、或離開團隊"""
    user_id = current_user["sub"]
    is_self = member_user_id == user_id

    if is_self:
        # 自我移除（Leave）— 任何人都可以離開
        result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id, TeamMember.user_id == user_id
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=404, detail="Not a team member")

        # 如果是 admin，需確保至少還有一個其他 admin
        if member.role == "admin":
            result = await db.execute(
                select(TeamMember).where(
                    TeamMember.team_id == team_id,
                    TeamMember.role == "admin",
                    TeamMember.user_id != user_id,
                )
            )
            if not result.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail="Cannot leave: you are the only admin. Delete the team or assign another admin first."
                )

        await db.delete(member)
        await db.commit()
        return {"message": "Left team"}
    else:
        # 移除他人 — 需要 admin 權限
        result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
                TeamMember.role == "admin",
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Only admin can remove members")

        # 先嘗試找已加入的成員
        result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id, TeamMember.user_id == member_user_id
            )
        )
        member = result.scalar_one_or_none()
        if member:
            await db.delete(member)
            await db.commit()
            return {"message": "Member removed"}

        # 找不到成員，嘗試找 pending invitation（用 invitation id）
        result = await db.execute(
            select(PendingInvitation).where(
                PendingInvitation.id == member_user_id,
                PendingInvitation.team_id == team_id,
            )
        )
        invitation = result.scalar_one_or_none()
        if invitation:
            await db.delete(invitation)
            await db.commit()
            return {"message": "Invitation cancelled"}

        raise HTTPException(status_code=404, detail="Member not found")


@router.delete("/{team_id}")
async def delete_team(
    team_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """刪除整個團隊（僅 admin 可操作，cascade 刪除所有成員和 collections）"""
    user_id = current_user["sub"]

    # 驗證 admin 權限
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
            TeamMember.role == "admin",
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only admin can delete team")

    # 刪除團隊（CASCADE 會自動刪除 team_members, pending_invitations, shared_collections）
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    await db.delete(team)
    await db.commit()
    return {"message": "Team deleted"}
