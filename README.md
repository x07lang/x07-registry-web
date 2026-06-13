# x07-registry-web

Browser UI for the X07 package registry at [x07.io](https://x07.io).

This repo is the human-facing package portal for the ecosystem. It renders package and schema information from the registry API so people can browse versions, inspect metadata, and follow publish-related flows without leaving the browser.

**Start here:** [`x07.io`](https://x07.io) · [`docs/getting-started/`](docs/getting-started/) · [`x07lang/x07-registry`](https://github.com/x07lang/x07-registry) · [`x07lang/x07`](https://github.com/x07lang/x07)

## What This Repo Is

- static registry UI built with SvelteKit
- runtime-configurable browser app for local and hosted registry backends
- mirrored schema surfaces served under `/spec/`

This repo is the web presentation layer. It does not replace the registry API or the toolchain docs.

## When To Use It

Use `x07-registry-web` when you want to:

- run the `x07.io` UI locally
- point the UI at a local registry for development
- work on package browsing and package-discovery UX
- refresh the mirrored schema slice served from `/spec/`

## Quick Start

Install and run:

```sh
npm ci
npm run dev
```

Checks:

```sh
bash scripts/check_generated_spec_mirror.sh
npm run check
npm run build
```

## Runtime Config

The built site loads runtime config from:

- `static/x07-registry-web-config.json`

That file controls which registry/index base the UI talks to at runtime.

## How It Fits The X07 Ecosystem

- [`x07`](https://github.com/x07lang/x07) provides the package commands and canonical package docs
- [`x07-registry`](https://github.com/x07lang/x07-registry) serves the backing API and sparse index
- `x07-registry-web` presents the same data to humans at `x07.io`

## Docs

Canonical end-user docs for packages and publishing live on `x07lang.org`:

- https://x07lang.org/docs/packages/
- https://x07lang.org/docs/packages/publishing-by-example/

Use this repo’s `docs/` directory for UI-specific and local-development guidance instead of duplicating the full package docs stack here.
