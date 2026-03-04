"""WebSocket 連線管理器 — 管理團隊即時同步的 WebSocket 連線"""

import json
from fastapi import WebSocket


class ConnectionManager:
    """管理以 team_id 分群的 WebSocket 連線"""

    def __init__(self):
        # { team_id: [ (websocket, user_id), ... ] }
        self.active_connections: dict[str, list[tuple[WebSocket, str]]] = {}

    async def connect(self, team_id: str, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if team_id not in self.active_connections:
            self.active_connections[team_id] = []
        self.active_connections[team_id].append((websocket, user_id))

    def disconnect(self, team_id: str, websocket: WebSocket):
        if team_id in self.active_connections:
            self.active_connections[team_id] = [
                (ws, uid) for ws, uid in self.active_connections[team_id]
                if ws is not websocket
            ]
            if not self.active_connections[team_id]:
                del self.active_connections[team_id]

    async def broadcast(self, team_id: str, message: dict, exclude_ws: WebSocket | None = None):
        """廣播訊息給同 team 的所有連線（可排除發送者）"""
        if team_id not in self.active_connections:
            return
        data = json.dumps(message)
        disconnected = []
        for ws, uid in self.active_connections[team_id]:
            if ws is exclude_ws:
                continue
            try:
                await ws.send_text(data)
            except Exception:
                disconnected.append(ws)
        # 清理斷線的連線
        for ws in disconnected:
            self.disconnect(team_id, ws)

    def get_online_count(self, team_id: str) -> int:
        return len(self.active_connections.get(team_id, []))


# 全域單例
manager = ConnectionManager()
