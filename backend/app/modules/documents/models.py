"""Document models — facture, proforma, bon de livraison, etc.

Design decision: ONE Document table with a `type` field rather than separate
tables per type. All document types share ~95% of fields (parties, lines,
totals, numbering, status). The few type-specific fields live in `metadata_json`.

A Document snapshots its data at generation time — it does NOT dynamically
re-read the underlying Order. This is important for legal compliance: a facture
must remain identical once issued.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field, Column, JSON, Relationship

from app.core.utils import gen_id, now, short_code


class DocumentType(str, Enum):
    PROFORMA = "proforma"          # Pro-forma invoice (not an invoice yet)
    FACTURE = "facture"            # Final invoice
    BON_DE_LIVRAISON = "bon_de_livraison"  # Delivery note
    QUOTE = "quote"                # Devis
    RECEIPT = "receipt"            # Reçu


class DocumentStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    SENT = "sent"
    PAID = "paid"          # factures
    CANCELLED = "cancelled"
    VOIDED = "voided"


def _prefix_for(doc_type: DocumentType) -> str:
    return {
        DocumentType.PROFORMA: "PF",
        DocumentType.FACTURE: "INV",
        DocumentType.BON_DE_LIVRAISON: "BL",
        DocumentType.QUOTE: "QT",
        DocumentType.RECEIPT: "RC",
    }[doc_type]


def gen_document_number(doc_type: DocumentType) -> str:
    """Quick generator — production should use a per-type sequence for legal
    continuity (no gaps in factures). Swap this out when ready."""
    return short_code(_prefix_for(doc_type))


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: str = Field(default_factory=gen_id, primary_key=True)
    document_number: str = Field(unique=True, index=True)
    type: DocumentType = Field(index=True)
    status: DocumentStatus = Field(default=DocumentStatus.DRAFT, index=True)

    # Optional linkages
    order_id: Optional[str] = Field(default=None, foreign_key="orders.id", index=True)
    shipment_id: Optional[str] = Field(default=None, foreign_key="shipments.id", index=True)
    customer_user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)

    # Issuer (our company info — can come from settings but snapshot here)
    issuer_name: str
    issuer_address: Optional[str] = None
    issuer_tax_id: Optional[str] = None  # SIRET, VAT, etc.
    issuer_phone: Optional[str] = None
    issuer_email: Optional[str] = None

    # Recipient snapshot
    recipient_name: str
    recipient_address: Optional[str] = None
    recipient_tax_id: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None

    # Dates
    issue_date: datetime = Field(default_factory=now)
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None

    # Totals
    subtotal: float = 0.0
    tax_total: float = 0.0
    discount_total: float = 0.0
    shipping_total: float = 0.0
    grand_total: float = 0.0
    currency: str = "EUR"

    # Line items snapshot — stored as JSON so we freeze the order state.
    # Each item: {sku, name, description, quantity, unit_price, discount, tax_rate, line_total}
    line_items: list[dict] = Field(default_factory=list, sa_column=Column(JSON))

    # Type-specific extras (payment terms, shipping method, etc.)
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    notes: Optional[str] = None
    # Path/URL to the generated PDF if stored
    pdf_path: Optional[str] = None

    created_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)