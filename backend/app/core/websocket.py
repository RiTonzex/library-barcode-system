import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("websocket_manager")


class ConnectionManager:
    """
    Manages active WebSocket connections to broadcast real-time scan events,
    heartbeat updates, and statistical changes to connected frontend clients.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcast a JSON payload to all connected clients.
        Automatically purges stale or dropped connections.
        """
        if not self.active_connections:
            return

        payload = json.dumps(message, default=str)
        stale_connections = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}. Marking for removal.")
                stale_connections.append(connection)

        for stale in stale_connections:
            self.disconnect(stale)


ws_manager = ConnectionManager()
