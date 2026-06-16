import os
import httpx
from typing import Dict, Any, Optional
import time
import hmac
import hashlib
import base64

DAILY_API_KEY = os.getenv("DAILY_API_KEY")
DAILY_WEBHOOK_SECRET = os.getenv("DAILY_WEBHOOK_SECRET")

class DailyService:
    BASE_URL = "https://api.daily.co/v1"

    @classmethod
    def _headers(cls) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {DAILY_API_KEY}",
            "Content-Type": "application/json"
        }

    @classmethod
    async def create_room(cls, name: str, exp_unix: int) -> Dict[str, Any]:
        """Creates a private Daily.co room."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{cls.BASE_URL}/rooms",
                headers=cls._headers(),
                json={
                    "name": name,
                    "privacy": "private",
                    "properties": {
                        "nbf": int(time.time()),
                        "exp": exp_unix,
                        "max_participants": 2,
                        "enable_recording": False,
                        "autojoin": False
                    }
                }
            )
            resp.raise_for_status()
            return resp.json()

    @classmethod
    async def delete_room(cls, room_name: str) -> bool:
        """Deletes a Daily.co room."""
        if not room_name:
            return False
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{cls.BASE_URL}/rooms/{room_name}",
                headers=cls._headers()
            )
            # If room doesn't exist, ignore
            if resp.status_code == 404:
                return True
            resp.raise_for_status()
            return True

    @classmethod
    async def generate_token(cls, room_name: str, is_owner: bool, exp_unix: int) -> str:
        """Generates a meeting join token."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{cls.BASE_URL}/meeting-tokens",
                headers=cls._headers(),
                json={
                    "properties": {
                        "room_name": room_name,
                        "is_owner": is_owner,
                        "exp": exp_unix,
                        "eject_after_elapsed": 3600
                    }
                }
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("token")

    @classmethod
    def verify_webhook_signature(cls, signature_header: str, payload: bytes) -> bool:
        """Verifies the Daily.co webhook X-Webhook-Signature."""
        if not DAILY_WEBHOOK_SECRET or not signature_header:
            return False
        
        # Daily.co uses base64 encoded HMAC-SHA256
        secret = DAILY_WEBHOOK_SECRET.encode("utf-8")
        mac = hmac.new(secret, msg=payload, digestmod=hashlib.sha256)
        expected_sig = base64.b64encode(mac.digest()).decode("utf-8")
        
        return hmac.compare_digest(expected_sig, signature_header)
