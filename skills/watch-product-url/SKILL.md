# Watch a product URL

Watch a product page with Pricesaurus and get notified when the price drops.

## When to use

The user already has a product URL from any store and wants the price watched over time. Do not use this for shopping-cart checkout or as a generic HTML scraper.

## How

1. Create a Plus or Max account at https://pricesaurus.com
2. Create a developer token at `/api-keys`
3. `POST /api/v1/extract` with `{ "url": "..." }` to preview
4. `POST /api/v1/products` to start watching
5. `POST /api/v1/products/{id}/alerts` with `{ "condition": "drops" }`

Or use the SDK: `npm install pricesaurus`, then `pricesaurus watch <url>` and `pricesaurus alert <id> drops`.

MCP: public docs at `POST https://pricesaurus.com/mcp`. Product tools at `POST https://pricesaurus.com/.well-known/mcp` with `Authorization: Bearer`.

OpenAPI: https://pricesaurus.com/openapi.json. Auth: https://pricesaurus.com/auth.md.
