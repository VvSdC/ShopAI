<p align="center">
  <img src="https://img.shields.io/badge/ShopAI-AI%20Powered%20E--Commerce-4f46e5?style=for-the-badge&logo=openai&logoColor=white" alt="ShopAI Badge" />
</p>

<h1 align="center">ShopAI</h1>

<p align="center">
  <strong>The AI-native e-commerce platform that thinks, searches, and assists — so your customers don't have to.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe" />
  <img src="https://img.shields.io/badge/GenAI-Multi--Provider-ff6f00?style=flat-square&logo=openai" />
</p>

---

## Why ShopAI?

Most e-commerce templates give you a storefront. **ShopAI gives you a brain.**

- **AI Shopping Assistant** — Every logged-in user gets a personal chatbot that can search products, check order status, find coupons, and answer questions — all through natural conversation. No more digging through menus.

- **Smart Product Discovery** — Products are automatically tagged by AI the moment an admin adds them. Whether it's "cricket bat" or "IPL jersey" or "traditional saree", the system understands context and creates searchable tags that make the chatbot and search smarter over time.

- **AI-Powered Content Moderation** — Reviews are checked for toxicity, spam URLs, PII leaks, and injection attempts in real-time by an LLM. Clean reviews get semantic tags (like "value for money", "fast delivery") that create instant visual summaries for other shoppers.

- **Zero Single Points of Failure** — Every AI call and every email goes through a multi-provider fallback chain. If one service hits a rate limit, the next one picks up seamlessly. Your store never goes down because an API had a bad day.

- **Production-Ready Security** — Helmet headers, rate limiting, input validation on every route, httpOnly JWT cookies, Stripe webhook verification, and server-side price enforcement. This isn't a tutorial project — it's built like production software.

- **Complete Admin Control** — Full dashboard to manage products, categories, brands, colors, coupons, orders, and customers. Upload images, track inventory, update order statuses, and monitor sales — all from one place.

- **Beautiful, Responsive UX** — Tailwind CSS throughout, accessible components via Headless UI, smooth cart management with stock validation, and a floating chat widget that's always one click away.

> **Built for startups to clone, customize, and ship.** Every feature you'd spend weeks building — auth, payments, admin panel, AI integration, email notifications, content moderation — is already here.

---

## Features

### Generative AI

| Feature | Description |
|---------|-------------|
| AI Shopping Assistant | Conversational chatbot with tool-calling — searches products, checks orders, finds coupons, retrieves shipping addresses |
| Multi-Provider LLM Fallback | Cerebras → Hugging Face → OpenRouter — automatic failover on rate limits with configurable models |
| AI Review Moderation | Async content moderation checking for toxicity, external URLs, PII, and injection attempts |
| Semantic Review Tagging | Automatic extraction of tags like "good quality", "fast delivery", "value for money" from review text |
| AI Product Tagging | LLM-generated search keywords from product name, description, category, and brand |
| Scoped & Secure | Assistant never discloses model details, never accesses other users' data, refuses off-topic queries, and supports only read operations |

### E-Commerce

| Feature | Description |
|---------|-------------|
| Product Catalog | Filter by category, brand, color, size, price range with full-text search and pagination |
| Multi-Image Products | Cloudinary-powered image uploads with multiple photos per product |
| Persistent Cart | LocalStorage-backed cart with quantity management, stock validation, and unavailable item handling |
| Stripe Checkout | Secure payment sessions with INR support, webhook verification, and automatic order updates |
| Server-Side Price Enforcement | Prices always come from the database — never trust the client |
| Coupon System | Percentage-based discounts with date validation, server-side enforcement, and public promotion banner (code hidden) |
| Order Lifecycle | Pending → Processing → Dispatched → Delivered (with cancellation and stock restoration) |
| Cart Validation API | Server-side stock and existence verification before checkout |
| Order History | Paginated order history with payment status tracking |

### User Management

| Feature | Description |
|---------|-------------|
| JWT Authentication | httpOnly cookie-based access + refresh tokens with automatic rotation |
| OTP Password Reset | 6-digit email OTP with 10-minute expiry — works across all domains, no magic links |
| Profile Management | Update name, email (uniqueness enforced), phone, and country |
| Multiple Shipping Addresses | Add, edit, and delete shipping addresses with full CRUD |
| Account Deletion | Self-service account removal with order anonymization |
| Account Blocking | Admin can block malicious users — enforced at login |
| Welcome Emails | Branded welcome email sent on registration |

### Admin Dashboard

| Feature | Description |
|---------|-------------|
| Sales Analytics | Aggregate stats — total sales, today's sales, min/max/average order value |
| Product Management | Create, edit, delete products with image uploads and stock tracking |
| Category & Brand Management | Full CRUD for categories (with images), brands, and colors |
| Coupon Management | Create, update, and delete time-bound discount coupons |
| Order Management | View all orders, update fulfillment status, track payments |
| Customer Management | View all users, block/unblock accounts |

### Security & Production Readiness

| Feature | Description |
|---------|-------------|
| Helmet | HTTP security headers (XSS, content-type sniffing, clickjacking protection) |
| Rate Limiting | Tiered limits — API (200/15min), Auth (15/15min), Chat (15/min) |
| Input Validation | Zod schemas on auth, orders, reviews, and chat routes |
| CORS | Configurable origin with credentials support |
| Compression | Gzip response compression for faster load times |
| Body Size Limits | 10MB cap on JSON and URL-encoded payloads |
| Trust Proxy | Proper client IP detection behind reverse proxies and load balancers |
| Error Handling | Global error middleware with conditional stack traces (hidden in production) |
| Webhook Security | Stripe signature verification — rejects events if secret is missing |

### Email Notifications

| Feature | Description |
|---------|-------------|
| Multi-Provider Fallback | Resend → Brevo — automatic failover on failure |
| Welcome Email | Branded onboarding email on registration |
| Password Reset OTP | Styled OTP delivery with expiry notice |
| Order Confirmation | Order number and total in a clean template |
| Order Status Updates | Shipping and delivery notifications |
| Review Flagged Alert | Notification when content moderation flags a review |

---

## Tech Stack

### Frontend
- **React 18** — Component-based SPA with hooks
- **Redux Toolkit** — Centralized state management with async thunks
- **React Router v6** — Client-side routing with protected routes
- **Tailwind CSS** — Utility-first styling
- **Headless UI** — Accessible, unstyled UI components
- **Heroicons** — SVG icon set
- **SweetAlert2** — Beautiful confirmation dialogs
- **Axios** — HTTP client with interceptors for token refresh

### Backend
- **Node.js + Express** — REST API server
- **MongoDB + Mongoose** — Database with schema validation, virtuals, and indexes
- **Stripe** — Payment processing with Checkout Sessions and webhooks
- **Cloudinary + Multer** — Image upload and CDN delivery
- **JSON Web Tokens** — Stateless authentication with refresh token rotation
- **Zod** — Runtime input validation
- **Helmet** — Security headers
- **express-rate-limit** — Request throttling
- **compression** — Response compression

### AI & Email Services
- **Cerebras** — Primary LLM inference provider
- **Hugging Face Inference API** — Secondary LLM provider
- **OpenRouter** — Tertiary LLM provider
- **Resend** — Primary transactional email service
- **Brevo (Sendinblue)** — Secondary email service

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Stripe account (test keys for development)
- Cloudinary account
- At least one LLM provider API key
- At least one email service API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ShopAI.git
cd ShopAI

# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies
cd ../Frontend
npm install
```

### Environment Setup

Copy the example env file and fill in your keys:

```bash
cp Backend/.env.example Backend/.env
```

Required variables:

```env
# Auth
JWT_KEY=your_jwt_secret
JWT_REFRESH_KEY=your_refresh_secret

# Database
MONGO_URL=mongodb://127.0.0.1:27017/ShopAI

# Stripe
STRIPE_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET_KEY=...

# Frontend URL
FRONTEND_URL=http://localhost:3000

# AI Providers (at least one required)
CEREBRAS_API_KEY=...
HUGGINGFACE_API_KEY=...
OPENROUTER_API_KEY=...

# Email (at least one required)
RESEND_API_KEY=...
BREVO_API_KEY=...
```

See [`Backend/.env.example`](Backend/.env.example) for the full list with comments.

### Run

```bash
# Terminal 1 — Backend
cd Backend
npm run server

# Terminal 2 — Frontend
cd Frontend
npm start

# Terminal 3 — Stripe webhooks (for local development)
stripe listen --forward-to localhost:2030/webhook
```

The app will be running at **http://localhost:3000** with the API at **http://localhost:2030**.

---

## Project Structure

```
ShopAI/
├── Backend/
│   ├── app/            # Express app setup, middleware, routes
│   ├── config/         # Database connection, file upload config
│   ├── controllers/    # Route handlers (users, products, orders, chat, etc.)
│   ├── middlewares/     # Auth, admin, validation, error handling
│   ├── model/          # Mongoose schemas (User, Product, Order, Review, etc.)
│   ├── routes/         # Express routers
│   ├── services/       # LLM service, email service, chat tools, moderation, tagging
│   ├── utils/          # Token generation, header parsing
│   ├── validations/    # Zod schemas for input validation
│   └── server.js       # Entry point
│
├── Frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Admin/      # Dashboard, product/category/order management
│       │   ├── ChatBot/    # AI assistant widget
│       │   ├── HomePage/   # Landing page, categories
│       │   ├── Navbar/     # Navigation with auth-aware menus
│       │   └── Users/      # Auth forms, product pages, cart, profile
│       ├── redux/          # Redux Toolkit slices and actions
│       └── utils/          # Axios instance, base URL config
│
└── README.md
```

---

## API Endpoints

<details>
<summary><strong>Authentication & Users</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/shopai/users/register` | Public | Register a new user |
| POST | `/shopai/users/login` | Public | Login with email & password |
| POST | `/shopai/users/refresh` | Cookie | Refresh access token |
| POST | `/shopai/users/logout` | Cookie | Logout and clear tokens |
| POST | `/shopai/users/forgot-password` | Public | Send password reset OTP |
| POST | `/shopai/users/verify-otp` | Public | Verify the 6-digit OTP |
| POST | `/shopai/users/reset-password` | Public | Reset password with OTP |
| GET | `/shopai/users/me` | Auth | Current user summary |
| GET | `/shopai/users/profile` | Auth | Full profile with orders |
| PUT | `/shopai/users/update/profile` | Auth | Update profile details |
| PUT | `/shopai/users/update/shipping` | Auth | Add shipping address |
| PUT | `/shopai/users/update/shipping/:id` | Auth | Edit shipping address |
| DELETE | `/shopai/users/update/shipping/:id` | Auth | Delete shipping address |
| DELETE | `/shopai/users/delete-account` | Auth | Delete own account |
| GET | `/shopai/users/all` | Admin | List all users |
| PUT | `/shopai/users/block/:id` | Admin | Block/unblock a user |

</details>

<details>
<summary><strong>Products</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shopai/products/` | Public | List with filters & pagination |
| GET | `/shopai/products/:id` | Public | Product details with reviews |
| POST | `/shopai/products/` | Admin | Create product (multipart) |
| PUT | `/shopai/products/:id` | Admin | Update product |
| DELETE | `/shopai/products/:id/delete` | Admin | Delete product |
| POST | `/shopai/products/validate-cart` | Public | Validate cart items against stock |

</details>

<details>
<summary><strong>Orders & Payments</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/shopai/orders/` | Auth | Create order & Stripe session |
| GET | `/shopai/orders/my-orders` | Auth | User's order history |
| GET | `/shopai/orders/:id` | Auth | Single order details |
| GET | `/shopai/orders/verify-payment/:session_id` | Auth | Verify Stripe payment |
| PUT | `/shopai/orders/cancel/:id` | Auth | Cancel pending order |
| GET | `/shopai/orders/` | Admin | All orders |
| PUT | `/shopai/orders/update/:id` | Admin | Update order status |
| GET | `/shopai/orders/sales/stats` | Admin | Sales analytics |

</details>

<details>
<summary><strong>Reviews, Coupons, Categories, Brands, Colors</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/shopai/reviews/:productID` | Auth | Create review (AI moderated) |
| PUT | `/shopai/reviews/:id` | Auth | Update review |
| DELETE | `/shopai/reviews/:id/product/:productID` | Auth | Delete review |
| GET | `/shopai/coupons/active` | Public | Active coupon (no code exposed) |
| GET | `/shopai/coupons/single?code=` | Auth | Validate coupon code |
| POST | `/shopai/coupons/` | Admin | Create coupon |
| GET/PUT/DELETE | `/shopai/coupons/...` | Admin | Manage coupons |
| POST/GET/PUT/DELETE | `/shopai/categories/...` | Admin* | Manage categories |
| POST/GET/PUT/DELETE | `/shopai/brands/...` | Admin* | Manage brands |
| POST/GET/PUT/DELETE | `/shopai/colors/...` | Admin* | Manage colors |

*GET endpoints are public; write operations require admin.

</details>

<details>
<summary><strong>AI Chat</strong></summary>

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/shopai/chat/message` | Auth | Send message to AI assistant |

</details>

---

## Architecture Highlights

- **3-Layer LLM Fallback** — Cerebras → Hugging Face → OpenRouter. Each provider is tried in sequence; on rate limits (429) or errors, the system transparently falls through to the next.

- **2-Layer Email Fallback** — Resend → Brevo. Same pattern — if the primary fails, the secondary takes over without any user-facing impact.

- **Async AI Processing** — Review moderation and product tagging happen in the background. The user sees their review immediately while AI processes it asynchronously.

- **Tool-Calling Architecture** — The chatbot uses OpenAI-compatible function calling to query real application data (orders, products, coupons) rather than hallucinating answers.

- **Cookie-Based JWT with Refresh Rotation** — Access tokens (15min) and refresh tokens (7 days) are stored in httpOnly, secure, sameSite cookies. No tokens in localStorage — immune to XSS theft.

- **Server-Side Price Enforcement** — Product prices in orders are always fetched from the database during checkout. Client-submitted prices are ignored, preventing price manipulation attacks.

---

## Contributing

Contributions are welcome. Please open an issue to discuss changes before submitting a PR.

For major features, create a branch and include clear testing steps.

---

<p align="center">
  Built by <a href="https://github.com/VvSdC"><strong>VVSD Charan</strong></a>
</p>
