from .lonestar import LonestarProvider


class FinancialService:
    """
    Central financial service for KOLO MUSIC.

    This service selects the correct mobile-money provider
    and keeps provider-specific logic out of the withdrawal routes.
    """

    def __init__(self):
        self.lonestar = LonestarProvider()

    def withdraw(
        self,
        provider: str,
        amount: float,
        mobile_money_number: str,
        mobile_money_name: str,
        external_reference: str | None = None,
    ):
        provider = provider.lower().strip()

        if provider == "lonestar":
            return self.lonestar.create_withdrawal(
                amount=amount,
                mobile_money_number=mobile_money_number,
                mobile_money_name=mobile_money_name,
                external_reference=external_reference,
            )

        raise ValueError(
            f"Unsupported mobile money provider: {provider}"
        )
