# Install a package (via `x07`)

The UI does not install packages; installation happens via the X07 toolchain.

Canonical docs:

- Packages overview: https://x07lang.org/docs/packages/
- Capability map (canonical picks, avoid duplicates): https://x07lang.org/agent/latest/catalog/capabilities.json

Typical workflow:

1. Find a package name + version in the UI (https://x07.io/packages).
2. Prefer the capability map for canonical choices; use the UI for name/version metadata.
3. Add it to your project with `x07 pkg add <name> --sync` (selects the latest non-yanked version).
4. Run `x07 test` (or `x07 run`) to validate.
