# Architecture

This document explains the *why* behind the structure. For the *how*, see `backend/README.md`.

## Guiding principles

1. **One module per domain.** Each module is self-contained: models, schemas, services, router. Dependencies flow downward only — modules depend on `core/`, never on each other at the service layer.
2. **Services are framework-free.** `service.py` files never import FastAPI. They take an `AsyncSession` and domain data. This means business logic is unit-testable and reusable from scripts, jobs, or a future CLI.
3. **Routers are thin.** They validate permissions, call services, and shape the HTTP response. That's it.
4. **One table per concept, discriminated by a type field.** A single `Location` table serves stores, warehouses, airports, hubs. A single `Document` table serves facture, proforma, BL, quote, receipt. A single `User` table serves all seven roles. Adding a new variant is an enum value, not a migration.
5. **Snapshot, don't reference, for legal docs.** A facture freezes order data as JSON at issue time. If the source order is edited later, the facture remains unchanged — legally required in most jurisdictions.

## Request lifecycle

```
Client
  │
  ▼
FastAPI app (main.py)
  │  CORS, exception handlers
  ▼
api_router (api.py)            /api/v1/*
  │
  ▼
Module router                  e.g. /shipments
  │  require_permission(...)   → RBAC check
  │  get_current_user(...)     → JWT decode + DB lookup
  ▼
Module service                 business logic
  │
  ▼
SQLModel / async session
  │
  ▼
PostgreSQL / SQLite
```

## RBAC design

`core/rbac.py` defines two enums — `Role` (7 values) and `Permission` (~20 values) — and a `ROLE_PERMISSIONS` matrix mapping each role to its permission set.

The key insight: permissions are *predicates*, not roles. A route asks "can you do X?" not "are you role Y?". This makes it trivial to add a new role (just define its permission set) or adjust what a role can do (edit one dict).

Owner-scoped permissions come in pairs: `SHIPMENT_READ_ALL` vs `SHIPMENT_READ_OWN`. The service layer doesn't care — filtering by ownership happens in the router where we know the current user.

## Why JSON `profile` / `metadata_json` fields?

Role-specific user data (a traveler's passport info, a driver's license number, a middleman's commission rate) lives in a JSON `profile` column rather than separate tables. Rationale:

- For MVP, we don't yet know every field every role will need.
- JSON avoids migrations for every tweak.
- Postgres JSON supports indexing if a field becomes hot.

When a field stabilizes and needs constraints or relations, promote it to a proper column with a migration. This is the classic "evolve schema where it matters, stay flexible where it doesn't" pattern.

## Why one `Document` table?

Facture, proforma, bon de livraison, quote, and receipt are structurally identical — issuer, recipient, line items, totals, status, numbering. The differences are:

- **Numbering prefix** (INV / PF / BL / QT / RC) — handled by `gen_document_number(type)`.
- **Legal status rules** — a facture must not change after issue; a proforma can. Enforced in the service layer per type.
- **Rendering** — the PDF template varies per type. Handled by a (future) template per type, not by a different DB schema.

Separating these into five tables would duplicate 95% of the schema and make cross-document queries (e.g. "all documents for customer X") a union mess.

## Shipment carrier types

The `CarrierType` enum (`driver`, `traveler`, `middleman`, `external`) lives alongside an optional `carrier_user_id` FK. This handles:

- **Internal driver** — FK to a user with role=driver.
- **Traveler** — FK to a user with role=traveler, plus `flight_number` + `flight_date`.
- **Middleman** — FK to a user with role=middleman. The middleman likely also created the shipment.
- **External courier** (DHL, UPS, etc.) — no FK; track by external reference in `metadata_json` (add field as needed).

## What's intentionally NOT here yet

- **Inventory module.** Orders currently accept free-text line items. Real inventory needs products, SKUs, stock levels per location, stock movements (in/out/adjust/transfer), and deduction hooks on order confirmation. This is the next module.
- **Payments module.** Document status has `PAID`, but no payment records, methods, or reconciliation. When you need it, it's a new module that references `documents` and `orders`.
- **Notifications.** Email / SMS / push. Belongs in a separate module that subscribes to domain events (when status changes to SHIPPED, notify recipient).
- **Alembic migrations.** Currently using `create_all` at startup — fine for dev, replace with migrations before prod.
- **Audit log.** `created_by_id` and timestamps exist on most tables. A proper audit log (who changed what, when) is a cross-cutting concern — add as middleware or a dedicated module.
- **Background workers.** PDF generation, email sending, webhooks. Celery or RQ sits alongside the API.

## Scaling path

1. **SQLite → Postgres** — one env var change.
2. **Single API → API + worker** — extract background tasks (PDF gen, emails) to Celery/RQ.
3. **Monolith → split services** — if one module grows enough, its folder is already a clean extraction boundary. Copy `modules/orders/` to a new service, replace in-process service calls with HTTP, done.