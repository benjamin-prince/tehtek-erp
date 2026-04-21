# Orders module — install

## 1. Update lib/types.ts

Append the contents of `lib/types-orders-append.ts` to the **end** of your existing `lib/types.ts` file.

## 2. Update lib/format.ts

Append the contents of `lib/format-orders-append.ts` to the **end** of your existing `lib/format.ts` file.

But you need to check one thing first: the appended file has `import type { OrderStatus }` at the top. If your existing `format.ts` already imports types from `"./types"`, merge the import with the existing one. e.g.:

```ts
// Before
import type { ShipmentStatus } from "./types";

// After (merged)
import type { OrderStatus, ShipmentStatus } from "./types";
```

Then delete the duplicate import from the appended section.

## 3. Copy these new files

```
components/order-status-badge.tsx            NEW
app/(dashboard)/orders/page.tsx              NEW
app/(dashboard)/orders/new/page.tsx          NEW
app/(dashboard)/orders/[id]/page.tsx         NEW
```

## 4. Overwrite sidebar

```
components/sidebar.tsx                       OVERWRITE
```

Change: `orders` entry no longer has `disabled: true`.

## 5. Hard refresh browser

`Ctrl+Shift+R` / `Cmd+Shift+R`.

## 6. Test

Log in as admin (or any role with `ORDER_CREATE`). Click **Orders** → **New order**.

Fill in:
- Customer name (required): e.g. "Jane Doe"
- Line 1 name (required): "Widget A", qty 2, unit price 15.00, tax 0.19
- Line 2: click **+ Add line** → "Installation", qty 1, unit price 50.00
- Shipping: 10
- Click **Create order**

You'll land on the detail page with a status pipeline in the sidebar. Change status to "confirmed", then "paid", and you'll see `confirmed_at` / `paid_at` timestamps populate.

## Permissions reminder

Backend `rbac.py`:
- `ORDER_CREATE` — admin, manager, employee, customer
- `ORDER_READ_ALL` — admin, manager, employee
- `ORDER_READ_OWN` — customer, middleman
- `ORDER_UPDATE` — admin, manager, employee

So as a customer, you can create orders and see only your own. As admin, you see everything and can change status.