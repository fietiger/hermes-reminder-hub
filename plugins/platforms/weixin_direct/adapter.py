# adapter.py - Hermes Platform Plugin: Weixin Direct Bridge
import os
import json
import logging
import urllib.request
import urllib.parse
from typing import Optional, Dict, Any

logger = logging.getLogger("hermes.platforms.weixin_direct")

class WeixinDirectAdapter:
    """
    Platform adapter for direct HTTP communication with local/remote weixin_direct bridge.
    Allows Hermes to send direct notifications without going through heavy polling loops.
    """
    def __init__(self, endpoint_url: str = "http://127.0.0.1:8765/send", auth_key: str = "hermes-weixin-direct-key-2024"):
        self.endpoint_url = os.getenv("WEIXIN_DIRECT_ENDPOINT", endpoint_url)
        self.auth_key = os.getenv("WEIXIN_DIRECT_AUTH_KEY", auth_key)

    def send_message(self, content: str, to_user: Optional[str] = None) -> Dict[str, Any]:
        """Send message via direct HTTP bridge."""
        payload = {"content": content}
        if to_user:
            payload["to_user"] = to_user

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self.endpoint_url, data=data, method="POST")
        req.add_header("Content-Type", "application/json; charset=utf-8")
        if self.auth_key:
            req.add_header("Authorization", f"Bearer {self.auth_key}")
            req.add_header("X-API-Key", self.auth_key)

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_str = resp.read().decode("utf-8")
                try:
                    return json.loads(res_str)
                except Exception:
                    return {"success": True, "raw": res_str}
        except Exception as e:
            logger.error(f"Failed to send direct weixin message: {e}")
            return {"success": False, "error": str(e)}

def create_adapter(config: Optional[Dict[str, Any]] = None):
    cfg = config or {}
    return WeixinDirectAdapter(
        endpoint_url=cfg.get("endpoint_url", "http://127.0.0.1:8765/send"),
        auth_key=cfg.get("auth_key", "hermes-weixin-direct-key-2024")
    )
