import { mkdtemp, readdir, readFile, rm, stat, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type SchemaEntry = { id: string; path: string; source: string; file: string };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv: string[]) {
  const opts: Record<string, string | boolean> = {
    check: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') {
      opts.check = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`missing value for ${arg}`);
      opts[key] = value;
      i += 1;
    }
  }
  return opts;
}

async function listSchemaFiles(dir: string): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  return items
    .filter((item) => item.isFile() && item.name.endsWith('.schema.json'))
    .map((item) => path.join(dir, item.name))
    .sort();
}

async function schemaId(schemaPath: string): Promise<string> {
  const data = JSON.parse(await readFile(schemaPath, 'utf8'));
  if (typeof data.$id !== 'string' || data.$id.length === 0) {
    throw new Error(`missing or invalid $id in ${schemaPath}`);
  }
  return data.$id;
}

async function collectSource(sourceName: string, dir: string): Promise<{ entries: SchemaEntry[]; files: string[] }> {
  const s = await stat(dir).catch(() => null);
  if (!s || !s.isDirectory()) {
    throw new Error(`missing source directory: ${dir}`);
  }
  const files = await listSchemaFiles(dir);
  const entries: SchemaEntry[] = [];
  for (const file of files) {
    entries.push({ id: await schemaId(file), path: path.basename(file), source: sourceName, file });
  }
  return { entries, files };
}

async function buildExpected(tmpOut: string, entries: SchemaEntry[]) {
  await mkdir(tmpOut, { recursive: true });
  for (const entry of entries) {
    await copyFile(entry.file, path.join(tmpOut, entry.path));
  }
  const index = { schemas: [...entries].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, path: p }) => ({ id, path: p })) };
  await writeFile(path.join(tmpOut, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
  await writeFile(
    path.join(tmpOut, '.generated-from'),
    JSON.stringify(
      {
        generated_by: 'scripts/update_spec_mirror.ts',
        sources: [...new Set(entries.map((e) => e.source))],
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

async function sameFile(a: string, b: string): Promise<boolean> {
  return (await readFile(a, 'utf8')) === (await readFile(b, 'utf8'));
}

async function compareDir(expectedDir: string, actualDir: string): Promise<boolean> {
  const expectedNames = (await readdir(expectedDir)).sort();
  const actualNames = (await readdir(actualDir).catch(() => [])).sort();
  if (JSON.stringify(expectedNames) !== JSON.stringify(actualNames)) {
    console.error('spec mirror file-set drift detected');
    console.error('expected:', expectedNames);
    console.error('actual:  ', actualNames);
    return false;
  }
  for (const name of expectedNames) {
    const expected = await readFile(path.join(expectedDir, name), 'utf8');
    const actual = await readFile(path.join(actualDir, name), 'utf8');
    if (expected !== actual) {
      console.error(`spec mirror drift detected: ${name}`);
      return false;
    }
  }
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = String(args.out ?? process.env.X07_REGISTRY_WEB_SPEC_OUT_DIR ?? path.join(repoRoot, 'static/spec'));
  const sourceMap = {
    x07: String(args['x07-dir'] ?? process.env.X07_SPEC_DIR ?? path.join(repoRoot, '_deps/x07/docs/spec/schemas')),
    'x07-wasm-backend': String(args['x07-wasm-dir'] ?? process.env.X07_WASM_SPEC_DIR ?? path.join(repoRoot, '_deps/x07-wasm-backend/crates/x07-wasm/spec/schemas')),
    'x07-platform-contracts': String(args['x07-platform-contracts-dir'] ?? process.env.X07_PLATFORM_CONTRACTS_SPEC_DIR ?? path.join(repoRoot, '_deps/x07-platform-contracts/spec/schemas')),
  };

  const allEntries: SchemaEntry[] = [];
  const ids = new Map<string, SchemaEntry>();
  const names = new Map<string, SchemaEntry>();

  for (const [sourceName, dir] of Object.entries(sourceMap)) {
    const { entries } = await collectSource(sourceName, dir);
    for (const entry of entries) {
      const seenById = ids.get(entry.id);
      if (seenById) {
        if (seenById.path === entry.path && (await sameFile(seenById.file, entry.file))) {
          continue;
        }
        throw new Error(`duplicate schema id ${entry.id} from ${sourceName}; already seen in ${seenById.source}`);
      }
      const seenByName = names.get(entry.path);
      if (seenByName) {
        if (seenByName.id === entry.id && (await sameFile(seenByName.file, entry.file))) {
          continue;
        }
        throw new Error(`duplicate schema filename ${entry.path} from ${sourceName}; already seen in ${seenByName.source}`);
      }
      ids.set(entry.id, entry);
      names.set(entry.path, entry);
      allEntries.push(entry);
    }
  }

  const tempRoot = await mkdtemp(path.join(tmpdir(), 'x07-registry-web-spec-'));
  const expectedDir = path.join(tempRoot, 'spec');
  await buildExpected(expectedDir, allEntries);

  if (args.check) {
    const ok = await compareDir(expectedDir, outDir);
    if (!ok) {
      console.error('run: npm exec --yes --package tsx -- tsx scripts/update_spec_mirror.ts');
      process.exit(1);
    }
    console.log('ok: registry-web spec mirror');
    return;
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const name of await readdir(expectedDir)) {
    await copyFile(path.join(expectedDir, name), path.join(outDir, name));
  }
  console.log(`wrote: ${outDir}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
