"""Document schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.modules.documents.models import DocumentStatus, DocumentType


class DocumentCreate(BaseModel):
    """Create a document directly (for quotes, ad-hoc factures, etc.)."""
    type: DocumentType
    order_id: Optional[str] = None
    shipment_id: Optional[str] = None
    customer_user_id: Optional[str] = None

    issuer_name: str
    issuer_address: Optional[str] = None
    issuer_tax_id: Optional[str] = None
    issuer_phone: Optional[str] = None
    issuer_email: Optional[str] = None

    recipient_name: str
    recipient_address: Optional[str] = None
    recipient_tax_id: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None

    due_date: Optional[datetime] = None
    currency: str = "EUR"
    notes: Optional[str] = None

    line_items: list[dict]
    metadata_json: Optional[dict] = None


class DocumentFromOrder(BaseModel):
    """Generate a document from an existing order — snapshot order data."""
    order_id: str
    type: DocumentType
    issuer_name: str
    issuer_address: Optional[str] = None
    issuer_tax_id: Optional[str] = None
    issuer_phone: Optional[str] = None
    issuer_email: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    metadata_json: Optional[dict] = None


class DocumentUpdate(BaseModel):
    status: Optional[DocumentStatus] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    pdf_path: Optional[str] = None


class DocumentRead(BaseModel):
    id: str
    document_number: str
    type: DocumentType
    status: DocumentStatus

    order_id: Optional[str]
    shipment_id: Optional[str]
    customer_user_id: Optional[str]

    issuer_name: str
    issuer_address: Optional[str]
    issuer_tax_id: Optional[str]

    recipient_name: str
    recipient_address: Optional[str]
    recipient_tax_id: Optional[str]

    issue_date: datetime
    due_date: Optional[datetime]
    paid_date: Optional[datetime]

    subtotal: float
    tax_total: float
    discount_total: float
    shipping_total: float
    grand_total: float
    currency: str

    line_items: list[dict]
    metadata_json: Optional[dict]
    notes: Optional[str]
    pdf_path: Optional[str]

    created_at: datetime

    class Config:
        from_attributes = True