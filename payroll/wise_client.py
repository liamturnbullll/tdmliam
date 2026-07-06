"""Thin client over the Wise Business API endpoints this tool needs.

Endpoints below are per docs.wise.com/api-reference (batch-group, quotes,
recipient) as of mid-2026. Wise's Sandbox v1 is deprecated in favour of
Sandbox v2 (api.wise-sandbox.com) — see payroll/README.md before pointing this
at a sandbox profile.
"""
from typing import Any, Optional

import requests

from .config import Config
from .sca import sign_one_time_token


class WiseAPIError(RuntimeError):
    pass


class WiseClient:
    def __init__(self, config: Config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {config.api_token}",
                "Content-Type": "application/json",
                "User-Agent": "tdm-payroll-automation",
            }
        )

    def _url(self, path: str) -> str:
        return f"{self.config.api_base}{path}"

    def _request(self, method: str, path: str, *, sca: bool = False, **kwargs: Any) -> dict:
        url = self._url(path)
        response = self.session.request(method, url, **kwargs)

        if response.status_code == 403 and response.headers.get("x-2fa-approval"):
            if not sca:
                raise WiseAPIError(
                    f"{method} {path} unexpectedly demanded SCA; refusing to sign "
                    "a challenge for an endpoint that isn't expected to require it"
                )
            one_time_token = response.headers["x-2fa-approval"]
            signature = sign_one_time_token(self.config.private_key_path, one_time_token)
            sca_headers = {"x-2fa-approval": one_time_token, "X-Signature": signature}
            headers = {**kwargs.pop("headers", {}), **sca_headers}
            response = self.session.request(method, url, headers=headers, **kwargs)

        if not response.ok:
            raise WiseAPIError(f"{method} {url} -> {response.status_code}: {response.text}")

        return response.json() if response.content else {}

    def get_recipient_account(self, account_id: str) -> dict:
        return self._request("GET", f"/v1/accounts/{account_id}")

    def create_quote(
        self,
        *,
        source_currency: str,
        target_currency: str,
        target_amount: float,
        target_account_id: Optional[str] = None,
    ) -> dict:
        body: dict[str, Any] = {
            "sourceCurrency": source_currency,
            "targetCurrency": target_currency,
            "targetAmount": target_amount,
        }
        if target_account_id:
            body["targetAccount"] = target_account_id
        return self._request("POST", f"/v3/profiles/{self.config.profile_id}/quotes", json=body)

    def create_batch_group(self, *, name: str, source_currency: str) -> dict:
        body = {"name": name, "sourceCurrency": source_currency}
        return self._request("POST", f"/v3/profiles/{self.config.profile_id}/batch-groups", json=body)

    def get_batch_group(self, batch_group_id: str) -> dict:
        return self._request(
            "GET", f"/v3/profiles/{self.config.profile_id}/batch-groups/{batch_group_id}"
        )

    def add_transfer(
        self,
        *,
        batch_group_id: str,
        target_account_id: str,
        quote_id: str,
        customer_transaction_id: str,
        reference: str,
    ) -> dict:
        body = {
            "targetAccount": target_account_id,
            "quoteUuid": quote_id,
            "customerTransactionId": customer_transaction_id,
            "details": {"reference": reference[:50]},
        }
        return self._request(
            "POST",
            f"/v3/profiles/{self.config.profile_id}/batch-groups/{batch_group_id}/transfers",
            json=body,
        )

    def complete_batch_group(self, *, batch_group_id: str, version: int) -> dict:
        body = {"status": "COMPLETED", "version": version}
        return self._request(
            "PATCH",
            f"/v3/profiles/{self.config.profile_id}/batch-groups/{batch_group_id}",
            json=body,
        )

    def fund_batch_group(self, *, batch_group_id: str) -> dict:
        body = {"type": "BALANCE"}
        return self._request(
            "POST",
            f"/v3/profiles/{self.config.profile_id}/batch-payments/{batch_group_id}/payments",
            json=body,
            sca=True,
        )
