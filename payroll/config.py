import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

REQUIRED_ENV_VARS = ("WISE_API_TOKEN", "WISE_PROFILE_ID", "WISE_PRIVATE_KEY_PATH")


@dataclass(frozen=True)
class Config:
    api_token: str
    profile_id: str
    private_key_path: Path
    api_base: str
    source_currency: str


def load_config() -> Config:
    load_dotenv()

    missing = [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]
    if missing:
        raise SystemExit(f"Missing required .env variables: {', '.join(missing)}")

    private_key_path = Path(os.environ["WISE_PRIVATE_KEY_PATH"]).expanduser()
    if not private_key_path.is_file():
        raise SystemExit(
            f"RSA private key not found at {private_key_path}. "
            "Run `python -m payroll.generate_keypair` first."
        )

    return Config(
        api_token=os.environ["WISE_API_TOKEN"],
        profile_id=os.environ["WISE_PROFILE_ID"],
        private_key_path=private_key_path,
        # Sandbox v2 host per docs.wise.com/guides/developer/environments; production is api.wise.com.
        api_base=os.getenv("WISE_API_BASE", "https://api.wise-sandbox.com").rstrip("/"),
        source_currency=os.getenv("WISE_SOURCE_CURRENCY", "GBP").upper(),
    )
