# How to apply this update

This is an incremental update to your existing `create-next-app` scaffold — designed for Next.js 14/15 with Tailwind v4.

## 1. Install new deps

```bash
npm install zustand @tanstack/react-query clsx
```

## 2. Copy files into your project

The folder structure matches your project exactly. Copy everything:

```
app/globals.css                              -> OVERWRITE (Tailwind v4 @theme tokens)
app/layout.tsx                               -> OVERWRITE
app/page.tsx                                 -> OVERWRITE

app/(auth)/layout.tsx                        -> NEW
app/(auth)/login/page.tsx                    -> NEW
app/(auth)/register/page.tsx                 -> NEW

app/(dashboard)/layout.tsx                   -> NEW
app/(dashboard)/dashboard/page.tsx           -> NEW
app/(dashboard)/shipments/page.tsx           -> NEW
app/(dashboard)/shipments/new/page.tsx       -> NEW
app/(dashboard)/shipments/[id]/page.tsx      -> NEW

app/track/page.tsx                           -> NEW
app/track/[code]/page.tsx                    -> NEW

components/logo.tsx                          -> NEW
components/page-header.tsx                   -> NEW
components/providers.tsx                     -> NEW
components/sidebar.tsx                       -> NEW
components/status-badge.tsx                  -> NEW

lib/api.ts                                   -> NEW
lib/auth-store.ts                            -> NEW
lib/format.ts                                -> NEW
lib/types.ts                                 -> NEW

.env.local.example                           -> Rename to .env.local
```

You can keep `app/favicon.ico`, `public/`, `AGENTS.md`, `CLAUDE.md`, `README.md` — nothing touches them.

You can **delete** if present:
- `tailwind.config.ts` / `tailwind.config.js` (Tailwind v4 reads `@theme` from CSS)

## 3. Confirm config files are untouched

These scaffold files don't need changes:
- `package.json` (just gains 3 deps)
- `tsconfig.json`
- `next.config.ts`
- `next-env.d.ts`
- `eslint.config.mjs`
- `postcss.config.mjs` — make sure it contains `"@tailwindcss/postcss": {}` (default in new scaffolds)

## 4. Set the API URL

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

## 5. Run

```bash
npm run dev
```

Visit http://localhost:3000. First load redirects to `/login` (or `/dashboard` if you have a session). The backend must be running at the URL in `.env.local`.

## Routes added

**Public**
- `/login`, `/register`
- `/track` (lookup form)
- `/track/[code]` (customer-facing shipment status, no auth)

**Dashboard (auth-gated)**
- `/dashboard` — overview with stats + recent shipments
- `/shipments` — filterable list
- `/shipments/new` — create form
- `/shipments/[id]` — detail with event timeline + status update panel

## Design notes

- **Fonts** load from Google Fonts inline at the top of `globals.css` (Fraunces display, Inter body, JetBrains Mono)
- **Tokens** live in `@theme { ... }` inside `globals.css` — change `--color-accent` and every accent on the site updates
- **Component classes** (`.btn-primary`, `.input-base`, `.label-base`, `.card`, `.mono-code`) are in the `@layer components` block
- **Tracking-tightest** is applied via `style={{letterSpacing: "var(--tracking-tightest)"}}` because Tailwind v4 doesn't auto-generate tracking utilities from `--tracking-*` tokens reliably

## Troubleshooting

**"Module not found: Can't resolve '@/lib/...'"** — your `tsconfig.json` should already have `"paths": {"@/*": ["./*"]}` from the scaffold. Check that it does.

**"Unknown at rule @theme"** — your PostCSS config is not using Tailwind v4. Check `postcss.config.mjs`:
```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**CORS errors when hitting the backend** — backend's `.env` `CORS_ORIGINS` should include `http://localhost:3000` or just stay as `["*"]` for dev.

**Colors not showing (e.g. `bg-paper` does nothing)** — verify `globals.css` is imported in `app/layout.tsx` and the `@theme` block is inside `globals.css`.