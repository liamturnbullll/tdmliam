#!/usr/bin/env python3
"""Generate the RSA keypair used for Wise SCA and print upload instructions.

Run once per environment (sandbox and live need separate keys registered against
their respective profiles). Never commit the private key.
"""
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

KEYS_DIR = Path(__file__).parent / "keys"


def main() -> None:
    KEYS_DIR.mkdir(exist_ok=True)
    private_path = KEYS_DIR / "private.pem"
    public_path = KEYS_DIR / "public.pem"

    if private_path.exists():
        raise SystemExit(f"{private_path} already exists — refusing to overwrite an existing key.")

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    private_path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    private_path.chmod(0o600)

    public_path.write_bytes(
        key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )

    print(f"Wrote {private_path} (chmod 600, keep secret, never commit).")
    print(f"Wrote {public_path}.")
    print()
    print("Next: upload the public key to Wise under Settings > Integrations and tools")
    print("> API tokens (personal token SCA public key upload), then set in .env:")
    print(f"  WISE_PRIVATE_KEY_PATH={private_path}")


if __name__ == "__main__":
    main()
