# Repository Guide

## Build and check

- `npm run check`
- `npm run build`

## Published schema workflow

- `static/spec/` is a published surface for `x07.io/spec/...`.
- When X07 adds or changes public schemas, update the schema files here and keep `static/spec/index.json` in sync.
- Prefer mirroring canonical schema contents from `x07/spec/`; do not hand-edit divergent copies.
- Registry-web changes for installer work should usually stay limited to static docs/schema surfaces unless the UI itself needs to expose the new data.
