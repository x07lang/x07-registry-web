# Install a package (via `x07`)

The UI does not install packages; installation happens via the X07 toolchain.

Canonical docs:

- Packages overview: https://x07lang.org/docs/packages/

Typical workflow:

1. Find a package name + version in the UI (https://x07.io/packages).
2. Add it to your project with `x07 pkg add <name>@<version> --sync`.
3. Run `x07 test` (or `x07 run`) to validate.

