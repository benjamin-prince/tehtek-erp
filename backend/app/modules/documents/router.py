"""Document endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.dependencies import get_current_user, require_permission
from app.core.rbac import Permission, has_permission
from app.modules.documents import service
from app.modules.documents.models import Document, DocumentStatus, DocumentType
from app.modules.documents.schemas import (
    DocumentCreate,
    DocumentFromOrder,
    DocumentRead,
    DocumentUpdate,
)

router = APIRouter(prefix="/documents", tags=["documents"])


def _can_view(user, doc: Document) -> bool:
    if has_permission(user.role, Permission.DOCUMENT_READ_ALL):
        return True
    if has_permission(user.role, Permission.DOCUMENT_READ_OWN):
        return user.id in {doc.customer_user_id, doc.created_by_id}
    return False


@router.post("", response_model=DocumentRead, status_code=201)
async def create_document(
    data: DocumentCreate,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.DOCUMENT_CREATE)),
):
    return await service.create_document(session, data, created_by_id=current.id)


@router.post("/from-order", response_model=DocumentRead, status_code=201)
async def document_from_order(
    data: DocumentFromOrder,
    session: AsyncSession = Depends(get_session),
    current=Depends(require_permission(Permission.DOCUMENT_CREATE)),
):
    """Snapshot an order into a document (facture, proforma, BL, etc.)."""
    return await service.generate_from_order(session, data, created_by_id=current.id)


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    type: DocumentType | None = Query(None),
    status: DocumentStatus | None = Query(None),
    order_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
    current=Depends(get_current_user),
):
    if has_permission(current.role, Permission.DOCUMENT_READ_ALL):
        return await service.list_documents(
            session, type=type, status=status, order_id=order_id,
            limit=limit, offset=offset,
        )
    if has_permission(current.role, Permission.DOCUMENT_READ_OWN):
        return await service.list_documents(
            session, type=type, status=status, order_id=order_id,
            customer_user_id=current.id, limit=limit, offset=offset,
        )
    raise HTTPException(status_code=403, detail="Not allowed")


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: str,
    session: AsyncSession = Depends(get_session),
    current=Depends(get_current_user),
):
    doc = await service.get_by_id(session, document_id)
    if not _can_view(current, doc):
        raise HTTPException(status_code=403, detail="Not allowed")
    return doc


@router.patch("/{document_id}", response_model=DocumentRead)
async def update_document(
    document_id: str,
    data: DocumentUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_permission(Permission.DOCUMENT_APPROVE)),
):
    doc = await service.get_by_id(session, document_id)
    return await service.update_document(session, doc, data)