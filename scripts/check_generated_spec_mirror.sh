#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

resolve_schema_dir() {
  local explicit="$1"
  local deps_dir="$2"
  local sibling_dir="$3"

  if [[ -n "${explicit}" ]]; then
    printf '%s\n' "${explicit}"
    return 0
  fi
  if [[ -d "${deps_dir}" ]]; then
    printf '%s\n' "${deps_dir}"
    return 0
  fi
  if [[ -d "${sibling_dir}" ]]; then
    printf '%s\n' "${sibling_dir}"
    return 0
  fi
  printf '%s\n' "${deps_dir}"
}

X07_SPEC_DIR="$(resolve_schema_dir "${X07_SPEC_DIR:-}" "$ROOT_DIR/_deps/x07/docs/spec/schemas" "$ROOT_DIR/../x07/docs/spec/schemas")"
X07_WASM_SPEC_DIR="$(resolve_schema_dir "${X07_WASM_SPEC_DIR:-}" "$ROOT_DIR/_deps/x07-wasm-backend/crates/x07-wasm/spec/schemas" "$ROOT_DIR/../x07-wasm-backend/crates/x07-wasm/spec/schemas")"
X07_PLATFORM_CONTRACTS_SPEC_DIR="$(resolve_schema_dir "${X07_PLATFORM_CONTRACTS_SPEC_DIR:-}" "$ROOT_DIR/_deps/x07-platform-contracts/spec/schemas" "$ROOT_DIR/../x07-platform-contracts/spec/schemas")"

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
