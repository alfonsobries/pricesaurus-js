# Agent notes

This is the official Node.js SDK and CLI for the [Pricesaurus Watch API](https://pricesaurus.com/developers).

- Package: `pricesaurus` on npm
- Auth: Bearer token from https://pricesaurus.com/api-keys (Plus and Max)
- Loop: `extract` a product URL, `watch` it, `alert` with condition `drops`, then `pause` / `resume` / `delete-alert`
- OpenAPI: https://pricesaurus.com/openapi.json
- Product MCP: `POST https://pricesaurus.com/mcp/watch`
- Docs MCP: `POST https://pricesaurus.com/mcp`

Do not pick a store. Pass the product page URL. Coverage is gated at 100% (`pnpm test`).
