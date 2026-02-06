# x07-registry-web

Registry UI for `x07.io`.

Support: see `SUPPORT.md`.

Community:

- Discord: https://discord.gg/59xuEuPN47
- Email: support@x07lang.org

This is a static SPA built with SvelteKit (`@sveltejs/adapter-static` with `fallback: index.html`).

## End-user docs

The UI is a browse/search surface; the canonical package workflows live on x07lang.org:

- Packages overview: https://x07lang.org/docs/packages/
- Publishing by example: https://x07lang.org/docs/packages/publishing-by-example/
- Agent contracts (canonical machine endpoints): https://x07lang.org/docs/agent/contract/

This repo also ships a small UI-focused guide under `docs/getting-started/`.

## Related repositories

- Registry API: https://github.com/x07lang/x07-registry
- Toolchain + canonical docs: https://github.com/x07lang/x07

## Toolchain schemas

`x07.io` serves the canonical JSON Schema files under `/spec/` (for example: `/spec/x07-run.report.schema.json`).

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
