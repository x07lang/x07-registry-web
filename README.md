# x07-registry-web

`x07-registry-web` is the browser UI for the X07 package registry at [`x07.io`](https://x07.io).

It gives end users a simple way to discover packages, inspect versions, read metadata, and follow publishing links, while still staying aligned with the same registry API and schema surfaces the toolchain uses.

Support: see `SUPPORT.md`.

Community:

- Discord: https://discord.gg/59xuEuPN47
- Email: support@x07lang.org

## What Is In This Repo

- **Static registry UI** built with SvelteKit
- **Runtime configuration loader** for choosing the backing API and index
- **Mirrored schema files** served under `/spec/`
- **UI-focused getting-started docs** under `docs/getting-started/`

This is a static SPA built with SvelteKit using `@sveltejs/adapter-static` and `fallback: index.html`.

## Vision

The vision is that X07 package distribution should feel coherent no matter how someone arrives there.

If a person starts from the browser, they should see the same package catalog and contract surface that `x07 pkg` and coding agents use. If they start from the CLI or an MCP client, the web UI should still be a trustworthy human-facing window into the same system.

## How It Fits The X07 Ecosystem

- [`x07`](https://github.com/x07lang/x07) provides the package commands and canonical package docs
- [`x07-registry`](https://github.com/x07lang/x07-registry) serves the registry API and sparse index
- `x07-registry-web` renders that data for humans at `x07.io`
- [`x07-platform-contracts`](https://github.com/x07lang/x07-platform-contracts) contributes the mirrored `lp.*` schema slice served from this site

So this repo is the human-facing package and schema portal for the broader language ecosystem.

## Practical Usage

Use this repo when you need to:

- run the `x07.io` UI locally
- point the UI at a local or hosted registry API
- refresh the mirrored schema set served from `/spec/`
- work on the package browsing and publishing experience

## End-User Docs

The UI is a browse and search surface. The canonical docs for packages, trust, and certification live on `x07lang.org`:

- Packages overview: https://x07lang.org/docs/packages/
- Publishing by example: https://x07lang.org/docs/packages/publishing-by-example/
- Formal verification & certification: https://x07lang.org/docs/toolchain/formal-verification/
- Review & trust artifacts: https://x07lang.org/docs/toolchain/review-trust/
- Agent contracts: https://x07lang.org/docs/agent/contract/

This repo also ships a smaller UI-focused guide under `docs/getting-started/`.

## Install And Run Locally

From the repo root:

```sh
npm ci
npm run dev
```

## Use It As Part Of The Full X07 Workflow

Keep this repo alongside:

- [`x07`](https://github.com/x07lang/x07) for install, package, and publish commands
- [`x07-registry`](https://github.com/x07lang/x07-registry) for the API server

In that setup:

- `x07 pkg ...` is the toolchain entrypoint
- `x07.io` is the human browse and discovery surface
- the same `/spec/` files stay available for machines and humans

## Related Repositories

- Registry API: https://github.com/x07lang/x07-registry
- Toolchain and canonical docs: https://github.com/x07lang/x07

## Toolchain Schemas

`x07.io` serves the canonical JSON Schema files under `/spec/`, for example `/spec/x07-run.report.schema.json`.
That includes the trust and certification schemas used by `x07 verify`, `x07 trust capsule`, `x07 trust certify`, runtime attestation, and review-diff tooling.

Platform `lp.*` schemas in `static/spec/` are mirrored from `x07-platform-contracts/spec/schemas/`.
Mirror generation requires checked-out schema sources for `x07`, `x07-wasm-backend`, and `x07-platform-contracts`.
`bash scripts/check_generated_spec_mirror.sh` auto-discovers the normal sibling checkout layout under `../x07`, `../x07-wasm-backend`, and `../x07-platform-contracts` before falling back to `_deps/`, and you can still override any path with `X07_*_SPEC_DIR`.
When the platform contract set changes, refresh the mirror from the contracts repo instead of hand-editing files in this repo.

The current hosted mirror includes the workload/release additions for the new PaaS line as well as the earlier hosted views. In particular, `/spec/` now serves the mirrored `lp.workload.*`, `lp.topology.*`, `lp.binding.*`, `lp.release.*`, and `lp.scale.profile@0.1.0` schemas alongside `lp.secret.list.result@0.1.0`, `lp.hosted.entitlements.result@0.1.0`, and `lp.usage.summary.result@0.1.0`.

## Runtime Config

The built site loads a runtime config JSON file at:

- `/x07-registry-web-config.json` served from `static/x07-registry-web-config.json`

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

If the runtime config is missing or invalid, the UI shows a "Registry misconfigured" page with the failing URL and details.

## Checks

```sh
bash scripts/check_generated_spec_mirror.sh
npm run check
npm run build
```
