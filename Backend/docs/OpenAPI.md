# ShopAI OpenAPI

Machine-readable API contract for the ShopAI backend, generated from **Zod validation schemas** and route definitions.

## Live docs (development)

When `OPENAPI_ENABLED=true` (default in dev/test):

| URL | Description |
|-----|-------------|
| `/shopai/docs` | Swagger UI |
| `/shopai/openapi.json` | OpenAPI 3.0 JSON |

Set `OPENAPI_ENABLED=true` in production if you want public docs on Render.

## Export static spec

```bash
npm run openapi:export
```

Writes `docs/openapi.json` — commit or feed to codegen tools (OpenAPI Generator, `openapi-typescript`, etc.).

## Source layout

| Path | Role |
|------|------|
| `openapi/schemas.js` | Registers Zod schemas from `validations/` as OpenAPI components |
| `openapi/paths/*.js` | Route definitions grouped by domain |
| `openapi/index.js` | Builds the full document |
| `openapi/swagger.js` | Express Swagger UI mount |

Request bodies that use Zod at runtime (`validations/*.js`) share the same shapes in the spec.

## Auth in Swagger UI

1. `GET /shopai/users/csrf-token` — copy token; browser stores `shopai_csrf` cookie.
2. Login via `POST /shopai/users/login` — sets `shopai_token`.
3. For mutating calls, add header `x-csrf-token` (Authorize → apiKey in UI, or use browser with cookies).

## Related markdown docs

- [Chatbot](./Chatbot.md)
- [Searchbox](./Searchbox.md)
- [ProductTagging](./ProductTagging.md)
- [CommentTagging](./CommentTagging.md)
