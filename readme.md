# ERP App

Modular ERP — shipping tracking, store/warehouse management, orders, documents.

## Structure

```
erp-app/
├── backend/       FastAPI + SQLModel, modular (one folder per domain)
├── web/           Next.js — admin dashboard + public tracking page
├── mobile/        Expo (React Native) — iOS + Android, barcode scanning
└── docs/          Architecture + decisions
```

All three clients talk to one versioned API (`/api/v1/*`). The backend exposes an OpenAPI schema at `/openapi.json`, so TypeScript types can be generated for web + mobile to keep everything in sync.

## What's built

### Backend — done
- **Core platform**: config, async DB, JWT auth, RBAC (7 roles × 20+ permissions), shared deps + exceptions
- **Auth module**: register (customer self-signup), login, refresh tokens
- **Users module**: profile CRUD, admin user management, role-specific JSON profile
- **Locations module**: unified store / warehouse / airport / hub / customs / pickup point
- **Shipments module**: full shipment lifecycle, carrier types (driver / traveler / middleman / external), tracking events with GPS + location FK, public tracking endpoint, mobile scan endpoint
- **Orders module**: orders + line items with auto-computed totals, status pipeline
- **Documents module**: facture / proforma / bon de livraison / quote / receipt — one table, snapshot-from-order

### To build
- **Web (Next.js)** — admin dashboard, login, CRUD screens per module, public `/track/[code]` page, document PDF viewer
- **Mobile (Expo)** — login, driver/traveler home with assigned shipments, QR scanner, status update + GPS capture, offline queue
- **Inventory module** — products, SKUs, stock per location, stock movements
- **Payments module** — payment records linked to documents
- **Notifications module** — email / SMS / push on status changes
- **PDF generation** — templates per document type
- **Alembic migrations** — replace `create_all` before production

## Getting started

Backend first:

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs.

See `backend/README.md` for full setup and `docs/ARCHITECTURE.md` for the design decisions behind the structure.

## Design principles

1. **Modular** — each domain is an isolated folder. Delete a module, the rest keeps working.
2. **Four-file pattern** — every module has the same shape: `models.py`, `schemas.py`, `service.py`, `router.py`.
3. **Services are framework-free** — business logic has no FastAPI imports. Testable, reusable.
4. **One table per concept** — `Location` covers stores + warehouses + airports; `Document` covers facture + proforma + BL. Discriminated by a `type` field.
5. **Permissions, not roles, on routes** — routes ask "can you do X?" not "are you role Y?". New roles = one dict edit.

## License

Your project, your choice.