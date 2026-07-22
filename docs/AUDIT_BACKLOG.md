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
| AUD-001 | done | JWT verification broken (async callback used synchronously) | `Backend/utils/verifyToken.js`, `middlewares/isLoggedin.js` | Fixed sync `jwt.verify`; `tests/unit/verifyToken.test.js` |
| AUD-002 | done | Coupon shown at checkout but not sent to API | `OrderPayment.js`, `ordersSlices.js` | Pass `couponCode` via `resolveCheckoutCouponCode`; `checkoutCoupon.test.js` |
| AUD-003 | done | Pay-then-cancel race | `orderService.js`, `storePolicy.js` | Block cancel during open checkout; auto-refund if paid after cancel |
| AUD-004 | deferred | Render blueprint disables all background queues | `render.yaml` | Intentional — Redis free tier limit on Render; BullMQ unavailable |
| AUD-005 | done | Abandoned checkout stock holds may never release | `checkoutQueue.js`, `server.js` | In-process timer + periodic sweep when queue disabled |

---

## High

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-006 | done | Success page claims payment before verification | `ThanksForOrdering.js` | Success UI gated on `verified`; verifying spinner first |
| AUD-007 | done | Payment verification failures silent | `ThanksForOrdering.js` | Error UI + retry; `paymentVerification.js` |
| AUD-008 | done | Non-atomic payment status updates | `orderService.js` | `findOneAndUpdate` guard before paid transition |
| AUD-009 | done | Checkout stock release not atomic | `checkoutQueue.js` | Atomic claim on `stockReservationReleasedAt` |
| AUD-010 | done | Rate limits bypassed when Redis store fails | `rateLimiters.js` | `passOnStoreError: false` when Redis store is used |
| AUD-011 | done | Per-process rate limits under horizontal scale | `rateLimiters.js`, `env.js` | `RATE_LIMIT_INSTANCE_COUNT` scales in-memory max |
| AUD-012 | done | No dedicated worker service in deploy | `worker.js`, `docker-compose.yml`, `render.yaml` | Documented optional worker blocks in IaC |
| AUD-013 | done | Shallow `/health` endpoint | `app/app.js`, `healthCheck.js` | MongoDB ping; 503 when degraded |
| AUD-014 | done | Registration succeeds when verification email fails | `usersCtrl.js` | Roll back user on email send failure |
| AUD-015 | done | Chat safety guard fails open | `guardClassifier.js` | Fail closed on LLM/parse errors |
| AUD-016 | done | Cart validation errors never shown | `ShoppingCart.js`, `cartSlices.js` | Surface `cartError` via `ErrorMsg` |
| AUD-017 | done | CSR SEO limits for product pages | `generate-seo-assets.js`, `netlify.toml` | Googlebot/Bingbot redirects; SITE_URL docs |
| AUD-018 | done | Stripe opens new tab without return handling | `OrderPayment.js` | Poll `payment-status` after checkout opens |

---

## Medium — Commerce & data integrity

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-019 | done | Invalid cart lines silently dropped at checkout | `orderCheckout.js` | Reject missing/OOS/variant mismatches with 400 |
| AUD-020 | done | No color/size validation at checkout | `orderCheckout.js` | Uses `resolveOptionMatch` / `resolveSizeForProduct` |
| AUD-021 | pending | Coupons lack per-user redemption limits | `Coupon.js`, `orderCheckout.js` | Skipped — coupon scope |
| AUD-022 | pending | Coupon code lacks unique DB index | `Coupon.js` | Skipped — coupon scope |
| AUD-023 | done | Review duplicate constraint app-only | `Review.js`, `reviewsCtrl.js` | Unique `{user, product}` index + 11000 handling |
| AUD-024 | done | Inconsistent paymentStatus casing | `paymentStatus.js`, `Order.js`, `orderService.js` | Normalize to `unpaid`/`paid` |
| AUD-025 | done | Checkout expiry queue lacks dead-letter handling | `checkoutQueue.js` | `DEFAULT_QUEUE_JOB_OPTIONS` + `attachQueueFailureHandlers` |
| AUD-026 | pending | Guest coupon client-only | `cartSlices.js` | Skipped — coupon scope |
| AUD-027 | done | No order-placement idempotency | `orderIdempotency.js`, `OrderPayment.js` | `Idempotency-Key` on POST `/orders` |
| AUD-028 | done | No shipment tracking model/flow | `Order.js`, `orderService.js` | `trackingCarrier`, `trackingNumber`, `shippedAt` on admin update |
| AUD-029 | done | Returns flow has zero automated tests | `returnService.test.js` | Eligibility window unit tests |
| AUD-030 | done | Email change without re-verification | `usersCtrl.js` | Re-verify + OTP on email change |
| AUD-031 | done | Account deletion without re-auth | `usersCtrl.js` | Requires `currentPassword` |
| AUD-032 | done | Admin order status update lacks Zod validation | `orderSchemas.js`, `ordersRouter.js` | `updateOrderStatusSchema` |
| AUD-033 | wontfix | Stripe webhook secret not required in prod config | `config/env.js` | Optional — poll + verify-payment work without webhook (see note below) |

---

## Medium — Frontend UX, a11y & flows

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-034 | done | SweetAlert-only error surfacing | `ErrorMsg.js` | `variant` prop: `inline` / `both`; used on cart/checkout |
| AUD-035 | done | Nested `<main>` landmarks | `Product.js`, `ProductsFilters.js` | `ProductsFilters` uses `<section>` |
| AUD-036 | done | Login labels not tied to inputs | `Login.js` | `htmlFor` + input `id` |
| AUD-037 | done | OTP inputs lack accessible names | `VerifyEmail.js`, `ForgotPassword.js` | Per-digit `aria-label` |
| AUD-038 | done | Address selection not keyboard-accessible | `AddShippingAddress.js` | `role="radio"` + keyboard handlers |
| AUD-039 | done | Product gallery thumbnails lack labels | `Product.js` | `aria-label` + `aria-current` on thumbs |
| AUD-040 | done | Session expiry hard-redirect drops state | `axiosInstance.js`, `SessionExpiredRedirect.js` | SPA navigate + logout |
| AUD-041 | done | Mobile chat overlaps cart checkout CTA | `App.js` | Hide chat on cart + checkout routes |
| AUD-042 | done | Shop pagination not in URL | `ProductsFilters.js` | `page` synced to query string |
| AUD-043 | done | Product load error shows empty shell | `Product.js` | Inline not-found panel |
| AUD-044 | done | Unsanitized markdown links in descriptions | `markdownLinks.js`, `MarkdownContent.js` | href allowlist |
| AUD-045 | done | No admin review moderation UI | `ManageReviews.js`, `reviewRouter.js` | Admin list + approve/reject |
| AUD-046 | deferred | No guest checkout | `App.js`, `ShoppingCart.js` | Large feature — checkout remains auth-gated |

---

## Medium — Infrastructure, search & AI

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-047 | done | Docker Compose omits Redis | `docker-compose.yml` | `redis:7-alpine` + `REDIS_URL` on backend |
| AUD-048 | done | Broken CI Compose target | `docker-compose.ci.yml` | Removed invalid `target: deps` |
| AUD-049 | deferred | No CD / deploy automation | `.github/workflows/ci.yml` | CI test/build only — deploy workflow not added |
| AUD-050 | done | Search path uncached and expensive | `productsCtrl.js`, `cacheKeys.js` | `productsSearchCacheKey` + `getCachedOrFetch` |
| AUD-051 | done | Local vector search in containerized Mongo | `docker-compose.yml` | Redis added; Atlas vector index for prod |
| AUD-052 | done | Embedding sync on API event loop | `embeddingSyncQueue.js` | Skips in-process sync in production without Redis |
| AUD-053 | done | Chat eval runs in API without Redis queue | `chatEvalQueue.js` | Fails queued eval in production without Redis |
| AUD-054 | done | SEO endpoints unrate-limited | `app.js`, `seoRouter.js` | `apiLimiter` on `/shopai/seo` |
| AUD-055 | done | Refresh token endpoint not rate-limited | `usersRoute.js` | `authLimiter` on `/refresh` |

---

## Low — Polish, features & ops

| ID | Status | Issue | Primary paths | Notes |
|----|--------|-------|---------------|-------|
| AUD-056 | done | No Product JSON-LD structured data | `PageSeo.js`, `Product.js` | `application/ld+json` Product schema |
| AUD-057 | done | Sensitive routes lack noIndex | `PrivatePageSeo.js`, cart/checkout/profile | `noindex,nofollow` on private routes |
| AUD-058 | done | Misleading admin access-denied page | `AdminOnly.js` | 403 copy + storefront link |
| AUD-059 | done | Wishlist lacks add-to-cart | `WishlistPage.js` | Add to cart with default variant |
| AUD-060 | done | No recently viewed / personalization | `recentlyViewed.js`, `HomeRecentlyViewed.js` | localStorage recently viewed strip |
| AUD-061 | done | Guest chat history in localStorage | `ChatWidget.js` | sessionStorage; cleared on sign-in |
| AUD-062 | done | Wishlist not exposed to chat tools | `chatTools.js` | get/add/remove wishlist tools |
| AUD-063 | done | Analytics summaries degraded without worker | `llmUsageAnalytics.js` | `degraded` flag on raw fallback |
| AUD-064 | done | No automated migration runner | `scripts/migrate.js`, `run-migrations.js` | `npm run migrate` |
| AUD-065 | done | Embedding dimension drift only warned | `embeddingSyncService.js` | Throws in production on mismatch |
| AUD-066 | done | Env documentation gaps | `.env.example` files | SITE_URL, Redis, queues, LOG_JSON |
| AUD-067 | done | Dual lockfiles in Frontend | `package-lock.json` | Removed `yarn.lock`; CI uses npm |
| AUD-068 | done | Frontend not linted in CI | `ci.yml` | ESLint step on `src/` |
| AUD-069 | done | Thin integration test coverage | `reviewsAdmin.test.js` | Admin reviews auth + health mongo |
| AUD-070 | done | Console-only observability | `logger.js` | Optional `LOG_JSON` structured logs |
| AUD-071 | done | Netlify CSP hardcodes localhost API | `netlify.toml`, `nginx.conf` | `connect-src` uses `https:` only |
| AUD-072 | done | Misleading token sentinel string | `getTokenFromHeader.js` | Returns `null` when missing |
| AUD-073 | done | No low-stock admin alerts | `ManageStocks.js` | Banner + amber badge ≤5 units |
| AUD-074 | done | No PWA / offline support | `service-worker.js`, `index.js` | Shell cache + manifest already present |
| AUD-075 | done | OpenAPI disabled in production by default | `config/env.js`, `.env.example` | Documented `OPENAPI_ENABLED=true` |
| AUD-076 | done | Similar-products PDP paid Atlas `$vectorSearch` unnecessary | `similarProductsService.js` | Simple category-scoped local cosine + Redis cache; `SIMILAR_PRODUCTS_MODE=simple\|atlas` |
| AUD-077 | done | No LLM cost estimate, error detail, tool telemetry in analytics | `llmPricing.js`, `llmUsageLogger.js`, `llmUsageAnalytics.js`, `llmUsageSummaryService.js`, `LlmUsageLog.js`, `LlmUsageSummary.js`, `agentRunner.js`, `llmService.js`, `inferenceTestService.js` | `costUsd`, `errorType`, `errorMessage`, `tool` + `chat_tool` source; per-span/tool/error breakdowns in dashboards |
| AUD-078 | done | No system health surface for admins | `systemHealthService.js`, `analyticsCtrl.js`, `analyticsRouter.js`, `SystemHealthPanel.js` | Live mongo/redis/providers/queues/embeddings/traffic snapshot |
| AUD-079 | done | Chat Usage panel missed degraded flag + cost/error/tool/span views | `ChatUsagePanel.js`, `ToolUsagePanel.js` | Added banner, cost cards, span/tool tables, top error types |
| AUD-080 | done | Repository missing LICENSE for others to fork | root `LICENSE`, `package.json`, `Backend/package.json`, `Frontend/package.json` | MIT license across the monorepo |
| AUD-081 | done | No architectural rationale doc for forkers | `docs/TECHNICAL_FAQ.md` | 15-question FAQ with mermaid diagrams; linked from root README + docs README |
| AUD-082 | done | docs/README stale (Analytics path, `/api/v1` prefix, no-streaming note) | `docs/README.md`, `Backend/docs/Chatbot.md` | Fixed prefix, mentioned streaming endpoint, updated Analytics tabs |

---

## Done log

| ID | Completed | Tests run | PR/commit |
|----|-----------|-----------|-----------|
| AUD-001 | 2026-07-07 | `npx vitest run tests/unit/verifyToken.test.js tests/unit/authMiddleware.test.js` | — |
| AUD-002 | 2026-07-07 | `npm test -- --watchAll=false src/utils/checkoutCoupon.test.js` | — |
| AUD-003 | 2026-07-07 | `npx vitest run tests/unit/storePolicy.test.js tests/unit/orderService.test.js` | — |
| AUD-005 | 2026-07-07 | `npx vitest run tests/unit/checkoutQueue.test.js` | — |
| AUD-006–018 | 2026-07-07 | Backend + Frontend test suites (see below) | — |
| AUD-019–055 (excl. coupons) | 2026-07-07 | Partial — see backlog statuses; coupon items skipped | — |
| AUD-034–075 | 2026-07-07 | Backend + Frontend full suite (see verification run) | — |
| AUD-076–082 | 2026-07-22 | `npm test` (Backend: 531/531 pass); `npm run build` (Frontend: compiled successfully) | — |

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
