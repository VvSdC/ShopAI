# ShopAI

ShopAI is a full‑stack e‑commerce demo application demonstrating a complete shopping experience (React + Redux frontend, Node/Express backend). It includes product browsing and filtering, a persistent cart with coupons, Stripe checkout, and an admin dashboard for managing products, categories, brands, colors, coupons and orders.

## Key features

- Product catalog
  - Category, brand, color, size and price filters
  - Search and pagination
- Product detail pages
  - Multiple images, descriptions, available sizes/colors, and user reviews
- Cart and checkout
  - Cart persisted in localStorage with quantity updates and item removal
  - Apply coupon codes to get discounts
  - Checkout flow integrated with Stripe for payments and order creation
- Admin dashboard
  - Add / edit / remove products and images (Cloudinary)
  - Manage stock, categories, brands, colors and coupons
  - View and update orders
- Authentication & users
  - JWT-based auth for protected routes, user profiles and order history

## Tech stack

- Frontend: React, Redux, React Router, Tailwind CSS
- Backend: Node.js, Express, MongoDB (Mongoose)
- Payments: Stripe
- Images: Cloudinary
- Auth: JWT

## Quick start

1. Clone the repository and open the project root.
2. Install dependencies for both backend and frontend:

```bash
cd Backend
npm install

cd ../Frontend
npm install
```

3. Create a `.env` file in the `Backend/` folder with the required variables (confirm exact names in `Backend/app/app.js` and `Backend/config`):

- `PORT` (optional)
- `MONGO_URL` — MongoDB connection string
- `JWT_KEY` — secret for signing JWTs
- `STRIPE_KEY` — Stripe secret key
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

4. Start the servers in separate terminals:

```bash
# Backend
cd Backend
npm run server

# Frontend
cd ../Frontend
npm start
```

## Project layout (high level)

- `Backend/` — Express app, models, controllers, routes, middlewares, config
- `Frontend/` — React app, components, redux slices, styles

## Notes & troubleshooting

- The backend and frontend `package.json` files have been renamed to `shopai` for consistency.
- When testing payments locally you may want to use the Stripe CLI or test keys; ensure webhooks and keys are configured correctly.
- If image uploads fail, verify Cloudinary credentials and network access.

## Contributing

- Open an issue or submit a pull request. For major changes, please create a branch and include clear testing steps.
