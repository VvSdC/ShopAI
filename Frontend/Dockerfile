# ── Build ──────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Set at deploy time — must be the public URL of your backend + /shopai prefix
ARG REACT_APP_API_URL=http://localhost:2030/shopai
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ── Serve static build ─────────────────────────────────────────
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
