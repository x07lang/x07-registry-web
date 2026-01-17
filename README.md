# x07-registry-web

Registry UI for `x07.io`.

This is a static SPA built with SvelteKit (`@sveltejs/adapter-static` with `fallback: index.html`).

## Config

Build-time environment variables (Vite/SvelteKit public env):

- `PUBLIC_X07_INDEX_BASE` (example: `https://registry.x07.io/index/`)
- `PUBLIC_X07_CATALOG_PATH` (default: `catalog.json`)

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
