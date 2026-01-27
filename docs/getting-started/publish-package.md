# Publish a package (via `x07`)

Publishing happens via the X07 toolchain and the registry API.

Canonical docs:

- Publishing by example: https://x07lang.org/docs/packages/publishing-by-example/

Typical workflow:

0. Create a publishable package repo: `x07 init --package` (also writes the agent kit: `AGENT.md`, `x07-toolchain.toml`, `.agent/`).
1. Edit `x07-package.json`: set `description`/`docs`, bump `version`.
2. Test: `x07 test --manifest tests/tests.json`.
3. Pack: `x07 pkg pack --package . --out dist/<name>-<version>.x07pkg`.
4. Login: `x07 pkg login` (GitHub OAuth).
5. Publish: `x07 pkg publish`.
