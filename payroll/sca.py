"""RSA signing for Wise Strong Customer Authentication (SCA) challenges.

Flow (docs.wise.com/guides/developer/auth-and-security/sca-over-api):
a request to a high-risk endpoint (e.g. funding a batch group) returns HTTP 403
with an `x-2fa-approval` header containing a one-time-token (OTT). Sign the OTT
with the private key whose public half is registered with Wise, then retry the
same request with `x-2fa-approval` and `X-Signature` headers set.
"""
import base64
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


def sign_one_time_token(private_key_path: Path, token: str) -> str:
    private_key = serialization.load_pem_private_key(
        private_key_path.read_bytes(), password=None
    )
    signature = private_key.sign(token.encode("ascii"), padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(signature).decode("ascii")
