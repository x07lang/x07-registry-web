#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

X07_SPEC_DIR="${X07_SPEC_DIR:-$ROOT_DIR/_deps/x07/docs/spec/schemas}"
X07_WASM_SPEC_DIR="${X07_WASM_SPEC_DIR:-$ROOT_DIR/_deps/x07-wasm-backend/crates/x07-wasm/spec/schemas}"
X07_PLATFORM_CONTRACTS_SPEC_DIR="${X07_PLATFORM_CONTRACTS_SPEC_DIR:-$ROOT_DIR/_deps/x07-platform-contracts/spec/schemas}"

for dir in "$X07_SPEC_DIR" "$X07_WASM_SPEC_DIR" "$X07_PLATFORM_CONTRACTS_SPEC_DIR"; do
  if [[ ! -d "$dir" ]]; then
    echo "missing required schema source directory: $dir" >&2
    exit 1
  fi
done

npm exec --yes --package tsx -- tsx scripts/update_spec_mirror.ts \
  --check \
  --x07-dir "$X07_SPEC_DIR" \
  --x07-wasm-dir "$X07_WASM_SPEC_DIR" \
  --x07-platform-contracts-dir "$X07_PLATFORM_CONTRACTS_SPEC_DIR"
