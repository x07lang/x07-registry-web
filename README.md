# x07-registry-web

Registry UI for `x07.io`.

This is a static SPA built with SvelteKit (`@sveltejs/adapter-static` with `fallback: index.html`).

## Runtime config

The built site loads a runtime config JSON file at:

- `/x07-registry-web-config.json` (served from `static/x07-registry-web-config.json`)

Example:

```json
{
  "schema": "x07.registry_web_config@v1",
  "index_base": "https://registry.x07.io/index/",
  "catalog_path": "catalog.json",
  "openapi_url": "/openapi/openapi.json"
}
```

Schema reference: `schemas/x07-registry-web-config.v1.schema.json`.

If the runtime config is missing or invalid, the UI shows a “Registry misconfigured” page with the failing URL and details.

## Development

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run check
npm run build
```
