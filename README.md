# Gocha Backend

Simple Express + MongoDB backend for authentication.

Setup

1. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Run locally:

```bash
npm run dev
```

Endpoints

- `POST /api/auth/register` { name, phone, password }
- `POST /api/auth/login` { phone, password }

Additional notes

- Several dev scripts were removed (seed/list/backfill scripts) to keep the repo focused; if you need them restored, check your git history.
- New feature: orders now include a QR delivery code on creation (returned as `deliveryCode` in the `POST /api/orders` response). Vendors can verify delivery by scanning the QR and calling `POST /api/orders/verify-delivery` with `{ orderId, code }`.
- Ensure `JWT_SECRET` is set in `.env` for token signing; avoid the development fallback in production.

The endpoints return a JSON Web Token and basic user object on success.
