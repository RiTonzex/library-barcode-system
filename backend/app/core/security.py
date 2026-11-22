import secrets
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)


async def verify_device_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Validates X-API-KEY header sent from ESP32 edge device.
    Uses constant time comparison secrets.compare_digest to prevent timing attacks.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing 'X-API-KEY' header in request."
        )

    if not secrets.compare_digest(api_key, settings.DEVICE_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Edge Device API Key."
        )

    return api_key
