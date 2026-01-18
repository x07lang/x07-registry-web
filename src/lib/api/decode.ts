import type {
	AccountResponse,
	Catalog,
	IndexConfig,
	IndexEntry,
	OwnersResponse,
	PackageManifest,
	PackageMetadataResponse,
	SearchResponse,
	SimpleOkResponse,
	TokenCreateResponse,
	TokenInfo,
	TokenListResponse,
	YankResponse
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, field: string): string {
	if (typeof value !== 'string') throw new Error(`${field} must be a string`);
	return value;
}

function expectBool(value: unknown, field: string): boolean {
	if (typeof value !== 'boolean') throw new Error(`${field} must be a boolean`);
	return value;
}

function expectNumber(value: unknown, field: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a number`);
	return value;
}

function expectStringArray(value: unknown, field: string): string[] {
	if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
		throw new Error(`${field} must be an array of strings`);
	}
	return value;
}

function expectOptionalStringArray(value: unknown, field: string): string[] | undefined {
	if (value === undefined || value === null) return undefined;
	return expectStringArray(value, field);
}

function expectOptionalString(value: unknown, field: string): string | undefined {
	if (value === undefined || value === null) return undefined;
	return expectString(value, field);
}

export function decodeIndexConfig(raw: unknown): IndexConfig {
	if (!isRecord(raw)) throw new Error('index config must be an object');
	const dl = expectString(raw.dl, 'dl');
	const api = expectString(raw.api, 'api');
	const authRequired = expectBool(raw['auth-required'], 'auth-required');
	if (raw.sparse !== true) throw new Error('sparse must be true');
	const verified_namespaces = expectOptionalStringArray(raw['verified-namespaces'], 'verified-namespaces');
	return verified_namespaces
		? { dl, api, auth_required: authRequired, sparse: true, verified_namespaces }
		: { dl, api, auth_required: authRequired, sparse: true };
}

export function decodeIndexEntry(raw: unknown): IndexEntry {
	if (!isRecord(raw)) throw new Error('index entry must be an object');
	const schemaVersion = expectString(raw.schema_version, 'schema_version');
	if (schemaVersion !== 'x07.index-entry@0.1.0') throw new Error('unsupported schema_version');
	const name = expectString(raw.name, 'name');
	const version = expectString(raw.version, 'version');
	const cksum = expectString(raw.cksum, 'cksum');
	const yanked = expectBool(raw.yanked, 'yanked');
	return { schema_version: 'x07.index-entry@0.1.0', name, version, cksum, yanked };
}

export function decodePackageManifest(raw: unknown): PackageManifest {
	if (!isRecord(raw)) throw new Error('package manifest must be an object');
	const schema_version = expectString(raw.schema_version, 'schema_version');
	const name = expectString(raw.name, 'name');
	const description = expectOptionalString(raw.description, 'description');
	const version = expectString(raw.version, 'version');
	const module_root = expectString(raw.module_root, 'module_root');
	const modules = expectStringArray(raw.modules, 'modules');
	return description
		? { schema_version, name, description, version, module_root, modules }
		: { schema_version, name, version, module_root, modules };
}

export function decodePackageMetadataResponse(raw: unknown): PackageMetadataResponse {
	if (!isRecord(raw)) throw new Error('metadata response must be an object');
	if (raw.ok !== true) throw new Error('metadata response ok must be true');
	const pkg = decodePackageManifest(raw.package);
	const cksum = expectString(raw.cksum, 'cksum');
	return { ok: true, package: pkg, cksum };
}

export function decodeCatalog(raw: unknown): Catalog {
	if (!isRecord(raw)) throw new Error('catalog must be an object');
	const schemaVersion = expectString(raw.schema_version, 'schema_version');
	if (schemaVersion !== 'x07.index-catalog@0.1.0') throw new Error('unsupported schema_version');

	const packagesRaw = raw.packages;
	if (!Array.isArray(packagesRaw)) throw new Error('packages must be an array');
	const packages = packagesRaw.map((p) => {
		if (!isRecord(p)) throw new Error('package must be an object');
		const name = expectString(p.name, 'name');
		const latest = p.latest === undefined ? undefined : expectString(p.latest, 'latest');
		return { name, latest };
	});

	return { schema_version: 'x07.index-catalog@0.1.0', packages };
}

export function decodeSearchResponse(raw: unknown): SearchResponse {
	if (!isRecord(raw)) throw new Error('search response must be an object');
	if (raw.ok !== true) throw new Error('search response ok must be true');
	const q = expectString(raw.q, 'q');
	const limit = expectNumber(raw.limit, 'limit');
	const offset = expectNumber(raw.offset, 'offset');
	const total = expectNumber(raw.total, 'total');
	const packagesRaw = raw.packages;
	if (!Array.isArray(packagesRaw)) throw new Error('packages must be an array');
	const packages = packagesRaw.map((p) => {
		if (!isRecord(p)) throw new Error('package must be an object');
		const name = expectString(p.name, 'name');
		const latest_version = expectOptionalString(p.latest_version, 'latest_version');
		const description = expectOptionalString(p.description, 'description');
		const modules_count = p.modules_count === undefined || p.modules_count === null ? undefined : expectNumber(p.modules_count, 'modules_count');
		return { name, latest_version, description, modules_count };
	});
	return { ok: true, q, limit, offset, total, packages };
}

export function decodeAccountResponse(raw: unknown): AccountResponse {
	if (!isRecord(raw)) throw new Error('account response must be an object');
	if (raw.ok !== true) throw new Error('account response ok must be true');
	const user_id = expectString(raw.user_id, 'user_id');
	const handle = expectString(raw.handle, 'handle');
	const token_id = expectString(raw.token_id, 'token_id');
	const scopes = expectStringArray(raw.scopes, 'scopes');
	return { ok: true, user_id, handle, token_id, scopes };
}

export function decodeTokenInfo(raw: unknown): TokenInfo {
	if (!isRecord(raw)) throw new Error('token must be an object');
	const id = expectString(raw.id, 'id');
	const label = expectString(raw.label, 'label');
	const scopes = expectStringArray(raw.scopes, 'scopes');
	const created_at = expectString(raw.created_at, 'created_at');
	const last_used_at = expectOptionalString(raw.last_used_at, 'last_used_at');
	const revoked_at = expectOptionalString(raw.revoked_at, 'revoked_at');
	const out: TokenInfo = { id, label, scopes, created_at };
	if (last_used_at) out.last_used_at = last_used_at;
	if (revoked_at) out.revoked_at = revoked_at;
	return out;
}

export function decodeTokenListResponse(raw: unknown): TokenListResponse {
	if (!isRecord(raw)) throw new Error('token list response must be an object');
	if (raw.ok !== true) throw new Error('token list response ok must be true');
	const tokensRaw = raw.tokens;
	if (!Array.isArray(tokensRaw)) throw new Error('tokens must be an array');
	const tokens = tokensRaw.map(decodeTokenInfo);
	return { ok: true, tokens };
}

export function decodeTokenCreateResponse(raw: unknown): TokenCreateResponse {
	if (!isRecord(raw)) throw new Error('token create response must be an object');
	if (raw.ok !== true) throw new Error('token create response ok must be true');
	const token_id = expectString(raw.token_id, 'token_id');
	const token = expectString(raw.token, 'token');
	const scopes = expectStringArray(raw.scopes, 'scopes');
	return { ok: true, token_id, token, scopes };
}

export function decodeSimpleOkResponse(raw: unknown): SimpleOkResponse {
	if (!isRecord(raw)) throw new Error('response must be an object');
	if (raw.ok !== true) throw new Error('ok must be true');
	return { ok: true };
}

export function decodeOwnersResponse(raw: unknown): OwnersResponse {
	if (!isRecord(raw)) throw new Error('owners response must be an object');
	if (raw.ok !== true) throw new Error('owners response ok must be true');
	const name = expectString(raw.name, 'name');
	const owners = expectStringArray(raw.owners, 'owners');
	return { ok: true, name, owners };
}

export function decodeYankResponse(raw: unknown): YankResponse {
	if (!isRecord(raw)) throw new Error('yank response must be an object');
	if (raw.ok !== true) throw new Error('yank response ok must be true');
	const name = expectString(raw.name, 'name');
	const version = expectString(raw.version, 'version');
	const yanked = expectBool(raw.yanked, 'yanked');
	return { ok: true, name, version, yanked };
}
