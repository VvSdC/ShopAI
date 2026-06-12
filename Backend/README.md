# ShopAI Backend

Express API for the ShopAI storefront: catalog, cart, orders, Stripe checkout, hybrid search, and the LangGraph shopping assistant.

**Full architecture & flows:** [`../docs/README.md`](../docs/README.md)

**Deep dives:** [`docs/`](docs/) — chatbot, search, product/review tagging.

---

## Requirements

- Node.js 20+
- MongoDB (local or Atlas)
- Optional: Redis (`REDIS_URL`) for response cache and BullMQ job queues

---

## Setup

```bash
cp .env.example .env
# Edit .env — at minimum: MONGO_URL, JWT_KEY, one LLM key, STRIPE_KEY for checkout

npm install
npm run dev          # API + Stripe webhook listener
# or
npm run start:server # API only
npm run start:worker # BullMQ workers (when Redis + queue flags enabled)
```

Frontend (separate folder): `cd ../Frontend && npm install && npm start`

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Nodemon API + `stripe listen` |
| `npm run start:server` | Production API process |
| `npm run start:worker` | Dedicated queue workers |
| `npm test` | Vitest unit + integration tests |
| `npm run search:reindex` | Rebuild product embeddings |
| `npm run test:keys` | Smoke-test external API keys |

---

## Layout

| Path | Role |
|------|------|
| `app/app.js` | Express app, middleware, Stripe webhook |
| `controllers/` | HTTP handlers (thin — logic in services) |
| `services/` | Business logic (`orderService`, `cartService`, `chatGraph`, search, cache) |
| `model/` | Mongoose schemas |
| `routes/` | Route definitions |
| `config/` | Env, DB, Redis, uploads |
| `worker.js` | BullMQ worker entry (no HTTP) |

---

## Key services

| Service | Responsibility |
|---------|----------------|
| `orderService.js` | Orders, cancel, payment sync, chat order summaries |
| `orderFulfillment.js` | Paid-order stock + confirmation email |
| `cartService.js` | Cart CRUD, coupons, stock validation |
| `returnService.js` | Return eligibility and requests |
| `chatGraph/` | LangGraph assistant pipeline |
| `chatDeterministicAssist.js` | Rule-based cart/checkout fallbacks after the agent |
| `search/` | Hybrid retrieval, embeddings, rerank |
| `cacheService.js` | Redis response cache (optional) |
| `queueWorkers.js` | Checkout expiry, embedding sync, coupon cache bust |

---

## Deploy (Render, from `main`)

| Setting | Value |
|---------|--------|
| Branch | `main` |
| Root directory | `Backend` |
| Build | `npm install` |
| Start | `npm run start:server` |
| Health check | `/health` |

Repo-root [`render.yaml`](../render.yaml) matches these settings. **Do not set `PORT`** — Render injects it.

**Required env vars:** `MONGO_URL`, `JWT_KEY`, `JWT_REFRESH_KEY`, `FRONTEND_URL`, `STRIPE_KEY`, `STRIPE_WEBHOOK_SECRET`, at least one LLM key (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`, etc.), `CLOUDINARY_*` for uploads.

**Recommended:** `API_PUBLIC_URL=https://your-service.onrender.com` (CSP / connect-src).

**Stripe webhook:** `https://your-service.onrender.com/webhook`

**Frontend API URL (later):** `REACT_APP_API_URL=https://your-service.onrender.com/shopai`

With Redis, set `REDIS_URL` and queue flags; keep `RUN_QUEUE_WORKERS_IN_API=false` on the web service and add a Render **Background Worker** (`npm run start:worker`, same `Backend` root).

---

## Environment

See [`.env.example`](.env.example). Notable flags:

- `REDIS_URL` — cache + BullMQ (optional locally)
- `ENABLE_CHECKOUT_QUEUE` / `ENABLE_EMBEDDING_SYNC_QUEUE`
- `RUN_QUEUE_WORKERS_IN_API` — defaults **`true`** in dev/test, **`false`** in production (`NODE_ENV=production`). In production run **`npm run start:worker`** as a separate process (Render background worker, second dyno, etc.) so embedding sync and checkout expiry do not block HTTP requests.
- `ENABLE_CHAT_DETERMINISTIC_ASSIST` — post-graph cart/checkout safety nets (default `true`)

---

## API base

Routes are mounted under `/shopai/` (auth, products, cart, orders, chat, admin analytics, etc.). See `routes/` and [`docs/README.md`](../docs/README.md) for endpoint maps.

---

<p align="center">
  <strong>ShopAI</strong> — <a href="https://github.com/VvSdC">VVSD Charan</a> &amp; <a href="https://github.com/pavankumar130">Pavan Meravath</a>
</p>
