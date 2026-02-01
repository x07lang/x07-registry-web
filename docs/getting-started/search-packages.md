# Search packages (x07.io UI)

The UI queries the registry sparse index (catalog + per-package entries) and renders package/version metadata.

To install a package, use the X07 toolchain:

- `x07 pkg add <name> --sync` (selects the latest non-yanked version)
- `x07 pkg versions <name>` (list available versions)
- `x07 pkg add <name>@<version> --sync` (pin a specific version)

See the canonical workflow docs:

- https://x07lang.org/docs/packages/

For agents (avoid duplicates), prefer the canonical capability map when choosing packages:

- https://x07lang.org/agent/latest/catalog/capabilities.json
