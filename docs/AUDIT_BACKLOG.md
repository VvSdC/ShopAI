# ShopAI — Audit Backlog

**Created:** 2026-07-06  
**Purpose:** Prioritized issue tracker for implement → test loops. Pick one item, fix it, add/run tests, mark done.

## How to use

1. Choose the next item from **Suggested order** (or by severity).
2. Set status to `in_progress` and note the branch/PR if useful.
3. Implement the fix (minimal diff).
4. Add or update tests; run relevant suite (`Backend`: `npx vitest run …`, `Frontend`: `npm test -- --watchAll=false …`).
5. Set status to `done` with date and test command used.
6. Repeat.

**Status values:** `pending` | `in_progress` | `done` | `wontfix` | `deferred`

---

## Suggested fix order (sprints)

| Sprint | IDs | Theme |
|--------|-----|--------|
| **P0** | AUD-001 – AUD-005 | Auth, checkout money, deploy queues |
| **P1** | AUD-006 – AUD-018 | Payment UX, races, rate limits, infra health |
| **P2** | AUD-019 – AUD-033 | Commerce integrity, validation, account safety |
| **P3** | AUD-034 – AUD-055 | Frontend a11y/UX, search/ops hardening |
| **P4** | AUD-056 – AUD-075 | Polish, features, observability, docs |

---

## Critical

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-001 | pending | JWT verification broken (async callback used synchronously) | `Backend/utils/verifyToken.js`, `middlewares/isLoggedin.js` | `jwt.verify` with callback returns `undefined` sync; tests mock `verifyToken` |
| AUD-002 | pending | Coupon shown at checkout but not sent to API | `Frontend/.../OrderPayment.js`, `ordersSlices.js` | `placeOrderAction` supports `couponCode` but handler omits it |
| AUD-003 | pending | Pay-then-cancel race | `Backend/services/orderService.js`, `orderFulfillment.js` | Cancel allowed while Stripe payment in flight |
| AUD-004 | pending | Render blueprint disables all background queues | `render.yaml` | All `ENABLE_*_QUEUE=false`; workers never run by default |
| AUD-005 | pending | Abandoned checkout stock holds may never release | `checkoutQueue.js`, `render.yaml` | Expiry queue no-op when disabled; relies on poll/webhook |

---

## High

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-006 | pending | Success page claims payment before verification | `ThanksForOrdering.js` | UI shows success before `verified` |
| AUD-007 | pending | Payment verification failures silent | `ThanksForOrdering.js` | Only `console.error`; no error UI |
| AUD-008 | pending | Non-atomic payment status updates | `orderService.js` | Race between webhook, verify, poll |
| AUD-009 | pending | Checkout stock release not atomic | `checkoutQueue.js` | Expiry vs fulfillment race |
| AUD-010 | pending | Rate limits bypassed when Redis store fails | `rateLimiters.js` | `passOnStoreError: true` |
| AUD-011 | pending | Per-process rate limits under horizontal scale | `rateLimiters.js`, `redisClient.js` | No Redis → limit × N replicas |
| AUD-012 | pending | No dedicated worker service in deploy | `worker.js`, `docker-compose.yml`, `render.yaml` | Worker process undocumented in IaC |
| AUD-013 | pending | Shallow `/health` endpoint | `app/app.js` | No MongoDB ping post-startup |
| AUD-014 | pending | Registration succeeds when verification email fails | `usersCtrl.js` | Orphan accounts if email provider down |
| AUD-015 | pending | Chat safety guard fails open | `chatGraph/guardClassifier.js` | LLM errors → `allowed: true` |
| AUD-016 | pending | Cart validation errors never shown | `ShoppingCart.js`, `cartSlices.js` | `validateCartAction.rejected` ignored in UI |
| AUD-017 | pending | CSR SEO limits for product pages | `PageSeo.js`, `netlify.toml` | Crawlers need bot redirects + `REACT_APP_SITE_URL` |
| AUD-018 | pending | Stripe opens new tab without return handling | `OrderPayment.js` | No poll on checkout page after `window.open` |

---

## Medium — Commerce & data integrity

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-019 | pending | Invalid cart lines silently dropped at checkout | `orderCheckout.js` | Bad IDs skipped with `continue` |
| AUD-020 | pending | No color/size validation at checkout | `orderSchemas.js`, `orderCheckout.js` | Variants not checked vs product |
| AUD-021 | pending | Coupons lack per-user redemption limits | `Coupon.js`, `orderCheckout.js` | Unlimited reuse |
| AUD-022 | pending | Coupon code lacks unique DB index | `Coupon.js` | App-only uniqueness |
| AUD-023 | pending | Review duplicate constraint app-only | `Review.js`, `reviewsCtrl.js` | No `{user, product}` unique index |
| AUD-024 | pending | Inconsistent paymentStatus casing | `Order.js`, `orderService.js` | `"Not paid"` vs `"paid"` |
| AUD-025 | pending | Checkout expiry queue lacks dead-letter handling | `checkoutQueue.js` | Failed expiry jobs not persisted |
| AUD-026 | pending | Guest coupon client-only | `cartSlices.js` | Doesn't sync to server cart on login |
| AUD-027 | pending | No order-placement idempotency | `orderCtrl.js`, `OrderPayment.js` | Double-click → duplicate sessions |
| AUD-028 | pending | No shipment tracking model/flow | `Order.js`, `ThanksForOrdering.js` | UI promises tracking; no AWB/carrier fields |
| AUD-029 | pending | Returns flow has zero automated tests | `returnService.js`, `tests/` | High regression risk |
| AUD-030 | pending | Email change without re-verification | `usersCtrl.js` | Session hijack → attacker email |
| AUD-031 | pending | Account deletion without re-auth | `usersCtrl.js` | Session-only delete |
| AUD-032 | pending | Admin order status update lacks Zod validation | `orderCtrl.js` | Invalid status → 500 |
| AUD-033 | pending | Stripe webhook secret not required in prod config | `config/env.js` | Only `STRIPE_KEY` in `validateConfig` |

---

## Medium — Frontend UX, a11y & flows

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-034 | pending | SweetAlert-only error surfacing | `ErrorMsg.js` | No persistent inline errors |
| AUD-035 | pending | Nested `<main>` landmarks | `App.js`, `Product.js`, `ProductsFilters.js` | a11y landmark confusion |
| AUD-036 | pending | Login labels not tied to inputs | `Login.js` | Missing htmlFor/id |
| AUD-037 | pending | OTP inputs lack accessible names | `VerifyEmail.js`, `ForgotPassword.js` | No per-digit aria-label |
| AUD-038 | pending | Address selection not keyboard-accessible | `AddShippingAddress.js` | Click-only div cards |
| AUD-039 | pending | Product gallery thumbnails lack labels | `Product.js` | No aria-current on selected thumb |
| AUD-040 | pending | Session expiry hard-redirect drops state | `axiosInstance.js` | Full reload clears Redux |
| AUD-041 | pending | Mobile chat overlaps cart checkout CTA | `ShoppingCart.js`, `ChatWidget.js` | z-index collision |
| AUD-042 | pending | Shop pagination not in URL | `ProductsFilters.js` | Page state lost on refresh |
| AUD-043 | pending | Product load error shows empty shell | `Product.js` | No inline 404 fallback |
| AUD-044 | pending | Unsanitized markdown links in descriptions | `MarkdownContent.js` | href allowlist missing |
| AUD-045 | pending | No admin review moderation UI | `App.js`, admin routes | Backend moderation exists |
| AUD-046 | pending | No guest checkout | `App.js`, `ShoppingCart.js` | Cart works; payment auth-gated |

---

## Medium — Infrastructure, search & AI

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-047 | pending | Docker Compose omits Redis | `docker-compose.yml` | No local queue/cache parity |
| AUD-048 | pending | Broken CI Compose target | `docker-compose.ci.yml` | `target: deps` missing in Dockerfile |
| AUD-049 | pending | No CD / deploy automation | `.github/workflows/ci.yml` | Test/build only |
| AUD-050 | pending | Search path uncached and expensive | `productsCtrl.js`, `searchService.js` | Every `?q=` runs full hybrid path |
| AUD-051 | pending | Local vector search in containerized Mongo | `vectorSearch.js`, `docker-compose.yml` | Auto → local cosine |
| AUD-052 | pending | Embedding sync on API event loop | `embeddingSyncQueue.js` | When queue disabled |
| AUD-053 | pending | Chat eval runs in API without Redis queue | `chatEvalQueue.js` | In-process LLM load |
| AUD-054 | pending | SEO endpoints unrate-limited | `app.js`, `seoRouter.js` | Bypasses apiLimiter |
| AUD-055 | pending | Refresh token endpoint not rate-limited | `usersRoute.js` | CSRF but no authLimiter |

---

## Low — Polish, features & ops

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-056 | pending | No Product JSON-LD structured data | `PageSeo.js`, `Product.js` | Rich results gap |
| AUD-057 | pending | Sensitive routes lack noIndex | `App.js`, `PageSeo.js` | Cart/checkout/profile |
| AUD-058 | pending | Misleading admin access-denied page | `AdminOnly.js` | Fake 404, wrong links |
| AUD-059 | pending | Wishlist lacks add-to-cart | `WishlistPage.js` | View-only cards |
| AUD-060 | pending | No recently viewed / personalization | Frontend broadly | Beyond similar products |
| AUD-061 | pending | Guest chat history in localStorage | `ChatWidget.js` | Shared-device privacy |
| AUD-062 | pending | Wishlist not exposed to chat tools | `chatTools.js` | REST only |
| AUD-063 | pending | Analytics summaries degraded without worker | `llmUsageAnalytics.js` | Raw log aggregation |
| AUD-064 | pending | No automated migration runner | `Backend/scripts/` | Manual one-off scripts |
| AUD-065 | pending | Embedding dimension drift only warned | `embeddingSyncService.js` | Doesn't block deploy |
| AUD-066 | pending | Env documentation gaps | `.env.example` files | Missing SITE_URL, Redis, queues |
| AUD-067 | pending | Dual lockfiles in Frontend | `package-lock.json`, `yarn.lock` | CI uses npm |
| AUD-068 | pending | Frontend not linted in CI | `ci.yml` | Backend ESLint only |
| AUD-069 | pending | Thin integration test coverage | `tests/integration/` | Few E2E API flows |
| AUD-070 | pending | Console-only observability | `logger.js` | No APM/metrics/Sentry |
| AUD-071 | pending | Netlify CSP hardcodes localhost API | `netlify.toml`, `nginx.conf` | Production CSP drift |
| AUD-072 | pending | Misleading token sentinel string | `getTokenFromHeader.js` | `"No token found..."` vs null |
| AUD-073 | pending | No low-stock admin alerts | Admin product flows | Display only |
| AUD-074 | pending | No PWA / offline support | Frontend | No service worker |
| AUD-075 | pending | OpenAPI disabled in production by default | `config/env.js` | Docs off unless enabled |

---

## Done log

| ID | Completed | Tests run | PR/commit |
|----|-----------|-----------|-----------|
| — | — | — | — |

---

## Already in good shape (reference)

- httpOnly cookies + CSRF (`axiosInstance.js`)
- Cart idempotency keys on mutations
- Stripe webhook idempotency + post-payment stock failure refunds
- React error boundaries (global + route)
- Hybrid search (keyword + vector + rerank)
- Checkout stock holds at session creation
- Email verification gate on reviews
- SEO: PageSeo, sitemap, bot preview redirects (recent)
- Product search autocomplete (recent)

---

*Update this file when starting or finishing each AUD-* item.*
