import base64
from pathlib import Path

import pytest
import responses
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

from payroll.config import Config
from payroll.wise_client import WiseAPIError, WiseClient


@pytest.fixture
def keypair(tmp_path):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    path = tmp_path / "private.pem"
    path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    return path, key


@pytest.fixture
def private_key_path(keypair) -> Path:
    return keypair[0]


@pytest.fixture
def config(private_key_path) -> Config:
    return Config(
        api_token="test-token",
        profile_id="99",
        private_key_path=private_key_path,
        api_base="https://api.wise-sandbox.com",
        source_currency="GBP",
    )


@responses.activate
def test_create_quote_success(config):
    responses.add(
        responses.POST,
        "https://api.wise-sandbox.com/v3/profiles/99/quotes",
        json={"id": "quote-1", "sourceAmount": 15.32},
        status=200,
    )
    client = WiseClient(config)
    quote = client.create_quote(
        source_currency="GBP", target_currency="RSD", target_amount=1000.0, target_account_id="acc-1"
    )
    assert quote["id"] == "quote-1"


@responses.activate
def test_non_ok_response_raises(config):
    responses.add(
        responses.POST,
        "https://api.wise-sandbox.com/v3/profiles/99/quotes",
        json={"error": "bad request"},
        status=400,
    )
    client = WiseClient(config)
    with pytest.raises(WiseAPIError):
        client.create_quote(source_currency="GBP", target_currency="RSD", target_amount=1.0)


@responses.activate
def test_fund_batch_group_completes_sca_challenge(config, keypair):
    private_key_path, private_key = keypair
    ott = "one-time-token-abc"

    responses.add(
        responses.POST,
        "https://api.wise-sandbox.com/v3/profiles/99/batch-payments/bg-1/payments",
        headers={"x-2fa-approval": ott},
        json={},
        status=403,
    )
    responses.add(
        responses.POST,
        "https://api.wise-sandbox.com/v3/profiles/99/batch-payments/bg-1/payments",
        json={"status": "COMPLETED"},
        status=200,
    )

    client = WiseClient(config)
    result = client.fund_batch_group(batch_group_id="bg-1")

    assert result == {"status": "COMPLETED"}
    assert len(responses.calls) == 2

    retried_request = responses.calls[1].request
    signature = base64.b64decode(retried_request.headers["X-Signature"])
    private_key.public_key().verify(
        signature, ott.encode("ascii"), padding.PKCS1v15(), hashes.SHA256()
    )
    assert retried_request.headers["x-2fa-approval"] == ott


@responses.activate
def test_unexpected_sca_challenge_raises(config):
    responses.add(
        responses.POST,
        "https://api.wise-sandbox.com/v3/profiles/99/quotes",
        headers={"x-2fa-approval": "unexpected-token"},
        json={},
        status=403,
    )
    client = WiseClient(config)
    with pytest.raises(WiseAPIError, match="unexpectedly demanded SCA"):
        client.create_quote(source_currency="GBP", target_currency="RSD", target_amount=1.0)
