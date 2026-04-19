"""Document business logic — issue, generate from order, list."""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.exceptions import NotFoundError
from app.core.utils import now
from app.modules.documents.models import (
    Document,
    DocumentStatus,
    DocumentType,
    gen_document_number,
)
from app.modules.documents.schemas import (
    DocumentCreate,
    DocumentFromOrder,
    DocumentUpdate,
)
from app.modules.orders.models import Order


async def _compute_totals(line_items: list[dict], shipping_total: float = 0.0) -> dict:
    subtotal = sum(i.get("quantity", 0) * i.get("unit_price", 0) for i in line_items)
    discount_total = sum(i.get("discount", 0) for i in line_items)
    tax_total = sum(
        max(0.0, i.get("quantity", 0) * i.get("unit_price", 0) - i.get("discount", 0))
        * i.get("tax_rate", 0)
        for i in line_items
    )
    grand_total = subtotal - discount_total + tax_total + shipping_total
    return {
        "subtotal": round(subtotal, 2),
        "discount_total": round(discount_total, 2),
        "tax_total": round(tax_total, 2),
        "shipping_total": round(shipping_total, 2),
        "grand_total": round(grand_total, 2),
    }


async def create_document(
    session: AsyncSession, data: DocumentCreate, created_by_id: str
) -> Document:
    totals = await _compute_totals(data.line_items)
    doc = Document(
        document_number=gen_document_number(data.type),
        type=data.type,
        status=DocumentStatus.DRAFT,
        order_id=data.order_id,
        shipment_id=data.shipment_id,
        customer_user_id=data.customer_user_id,
        issuer_name=data.issuer_name,
        issuer_address=data.issuer_address,
        issuer_tax_id=data.issuer_tax_id,
        issuer_phone=data.issuer_phone,
        issuer_email=data.issuer_email,
        recipient_name=data.recipient_name,
        recipient_address=data.recipient_address,
        recipient_tax_id=data.recipient_tax_id,
        recipient_phone=data.recipient_phone,
        recipient_email=data.recipient_email,
        due_date=data.due_date,
        currency=data.currency,
        notes=data.notes,
        line_items=data.line_items,
        metadata_json=data.metadata_json,
        created_by_id=created_by_id,
        **totals,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


async def generate_from_order(
    session: AsyncSession, data: DocumentFromOrder, created_by_id: str
) -> Document:
    """Snapshot an order into a document. Line items are frozen."""
    order_query = (
        select(Order).where(Order.id == data.order_id).options(selectinload(Order.items))
    )
    order = (await session.execute(order_query)).scalar_one_or_none()
    if not order:
        raise NotFoundError("Order not found")

    line_items = [
        {
            "sku": i.sku,
            "name": i.name,
            "description": i.description,
            "quantity": i.quantity,
            "unit_price": i.unit_price,
            "discount": i.discount,
            "tax_rate": i.tax_rate,
            "line_total": i.line_total,
        }
        for i in order.items
    ]

    doc = Document(
        document_number=gen_document_number(data.type),
        type=data.type,
        status=DocumentStatus.DRAFT,
        order_id=order.id,
        customer_user_id=order.customer_user_id,
        issuer_name=data.issuer_name,
        issuer_address=data.issuer_address,
        issuer_tax_id=data.issuer_tax_id,
        issuer_phone=data.issuer_phone,
        issuer_email=data.issuer_email,
        recipient_name=order.customer_name,
        recipient_address=order.billing_address or order.shipping_address,
        recipient_phone=order.customer_phone,
        recipient_email=order.customer_email,
        due_date=data.due_date,
        currency=order.currency,
        notes=data.notes,
        line_items=line_items,
        subtotal=order.subtotal,
        tax_total=order.tax_total,
        discount_total=order.discount_total,
        shipping_total=order.shipping_total,
        grand_total=order.grand_total,
        metadata_json=data.metadata_json,
        created_by_id=created_by_id,
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


async def get_by_id(session: AsyncSession, document_id: str) -> Document:
    doc = (
        await session.execute(select(Document).where(Document.id == document_id))
    ).scalar_one_or_none()
    if not doc:
        raise NotFoundError("Document not found")
    return doc


async def list_documents(
    session: AsyncSession,
    type: Optional[DocumentType] = None,
    status: Optional[DocumentStatus] = None,
    customer_user_id: Optional[str] = None,
    order_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Document]:
    query = select(Document).order_by(Document.created_at.desc())
    if type:
        query = query.where(Document.type == type)
    if status:
        query = query.where(Document.status == status)
    if customer_user_id:
        query = query.where(Document.customer_user_id == customer_user_id)
    if order_id:
        query = query.where(Document.order_id == order_id)
    result = await session.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())


async def update_document(
    session: AsyncSession, doc: Document, data: DocumentUpdate
) -> Document:
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(doc, k, v)
    doc.updated_at = now()
    if data.status == DocumentStatus.PAID and not doc.paid_date:
        doc.paid_date = now()
    await session.commit()
    await session.refresh(doc)
    return doc