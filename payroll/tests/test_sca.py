from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from payroll.sca import sign_one_time_token


def _write_private_key(path: Path) -> rsa.RSAPrivateKey:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    return key


def test_signature_verifies_against_public_key(tmp_path):
    key_path = tmp_path / "private.pem"
    key = _write_private_key(key_path)
    token = "one-time-token-value"

    signature_b64 = sign_one_time_token(key_path, token)

    import base64

    signature = base64.b64decode(signature_b64)
    key.public_key().verify(
        signature, token.encode("ascii"), padding.PKCS1v15(), hashes.SHA256()
    )  # raises InvalidSignature on mismatch


def test_signature_is_ascii_safe_base64(tmp_path):
    key_path = tmp_path / "private.pem"
    _write_private_key(key_path)

    signature_b64 = sign_one_time_token(key_path, "abc123")

    assert signature_b64.encode("ascii")  # header-safe
