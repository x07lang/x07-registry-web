# Publish a package (via `x07`)

Publishing happens via the X07 toolchain and the registry API.

Canonical docs:

- Publishing by example: https://x07lang.org/docs/packages/publishing-by-example/

Typical workflow:

1. Build and test locally (`x07 test`).
2. Pack: `x07 pkg pack --package <dir> --out <path>`.
3. Login: `x07 pkg login` (GitHub OAuth).
4. Publish: `x07 pkg publish`.

