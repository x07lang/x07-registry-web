import type {
	AdvisoriesResponse,
	AdvisoryCreateResponse,
	AdvisoryWithdrawResponse,
	AccountResponse,
	AuthSessionResponse,
	Catalog,
	IndexConfig,
	IndexEntry,
	OwnersResponse,
	PackageManifest,
	PackageMetadataResponse,
	PkgAdvisory,
	PkgAdvisoryKind,
	PkgAdvisorySeverity,
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

function expectOptionalNumber(value: unknown, field: string): number | undefined {
	if (value === undefined || value === null) return undefined;
	return expectNumber(value, field);
}

function expectPkgAdvisoryKind(value: unknown, field: string): PkgAdvisoryKind {
	const v = expectString(value, field) as PkgAdvisoryKind;
	switch (v) {
		case 'broken':
		case 'security':
		case 'deprecated':
			return v;
		default:
			throw new Error(`${field} must be a valid advisory kind`);
	}
}

function expectPkgAdvisorySeverity(value: unknown, field: string): PkgAdvisorySeverity {
	const v = expectString(value, field) as PkgAdvisorySeverity;
	switch (v) {
		case 'low':
		case 'medium':
		case 'high':
		case 'critical':
			return v;
		default:
			throw new Error(`${field} must be a valid advisory severity`);
	}
}

export function decodePkgAdvisory(raw: unknown): PkgAdvisory {
	if (!isRecord(raw)) throw new Error('advisory must be an object');
	const schemaVersion = expectString(raw.schema_version, 'schema_version');
	if (schemaVersion !== 'x07.pkg.advisory@0.1.0') throw new Error('unsupported advisory schema_version');
	const id = expectString(raw.id, 'id');
	const pkg = expectString(raw.package, 'package');
	const version = expectString(raw.version, 'version');
	const kind = expectPkgAdvisoryKind(raw.kind, 'kind');
	const severity = expectPkgAdvisorySeverity(raw.severity, 'severity');
	const summary = expectString(raw.summary, 'summary');
	const url = expectOptionalString(raw.url, 'url');
	const details = expectOptionalString(raw.details, 'details');
	const created_at_utc = expectString(raw.created_at_utc, 'created_at_utc');
	const withdrawn_at_utc = expectOptionalString(raw.withdrawn_at_utc, 'withdrawn_at_utc');

	const out: PkgAdvisory = {
		schema_version: 'x07.pkg.advisory@0.1.0',
		id,
		package: pkg,
		version,
		kind,
		severity,
		summary,
		created_at_utc
	};
	if (url) out.url = url;
	if (details) out.details = details;
	if (withdrawn_at_utc) out.withdrawn_at_utc = withdrawn_at_utc;
	return out;
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
	const description = expectOptionalString(raw.description, 'description');
	const docs = expectOptionalString(raw.docs, 'docs');
	const advisoriesRaw = raw.advisories;
	let advisories: PkgAdvisory[] | undefined;
	if (advisoriesRaw !== undefined && advisoriesRaw !== null) {
		if (!Array.isArray(advisoriesRaw)) throw new Error('advisories must be an array');
		advisories = advisoriesRaw.map(decodePkgAdvisory);
	}

	const out: IndexEntry = { schema_version: 'x07.index-entry@0.1.0', name, version, cksum, yanked };
	if (description) out.description = description;
	if (docs) out.docs = docs;
	if (advisories) out.advisories = advisories;
	return out;
}

export function decodePackageManifest(raw: unknown): PackageManifest {
	if (!isRecord(raw)) throw new Error('package manifest must be an object');
	const schema_version = expectString(raw.schema_version, 'schema_version');
	const name = expectString(raw.name, 'name');
	const description = expectOptionalString(raw.description, 'description');
	const docs = expectOptionalString(raw.docs, 'docs');
	const version = expectString(raw.version, 'version');
	const module_root = expectString(raw.module_root, 'module_root');
	const modules = expectStringArray(raw.modules, 'modules');
	const meta = raw.meta === undefined || raw.meta === null ? undefined : raw.meta;
	if (meta !== undefined && !isRecord(meta)) throw new Error('meta must be an object');

	const base = { schema_version, name, version, module_root, modules };
	const withDesc = description ? { ...base, description } : base;
	const withDocs = docs ? { ...withDesc, docs } : withDesc;
	return meta ? { ...withDocs, meta } : withDocs;
}

export function decodePackageMetadataResponse(raw: unknown): PackageMetadataResponse {
	if (!isRecord(raw)) throw new Error('metadata response must be an object');
	if (raw.ok !== true) throw new Error('metadata response ok must be true');
	const pkg = decodePackageManifest(raw.package);
	const cksum = expectString(raw.cksum, 'cksum');
	const is_official = expectBool(raw.is_official, 'is_official');

	const facets =
		raw.facets === undefined || raw.facets === null ? undefined : expectStringArray(raw.facets, 'facets');
	const scale_classes_supported =
		raw.scale_classes_supported === undefined || raw.scale_classes_supported === null
			? undefined
			: expectStringArray(raw.scale_classes_supported, 'scale_classes_supported');
	const scale_tested =
		raw.scale_tested === undefined || raw.scale_tested === null
			? undefined
			: expectBool(raw.scale_tested, 'scale_tested');
	const scale_test_evidence_ref =
		raw.scale_test_evidence_ref === undefined
			? undefined
			: raw.scale_test_evidence_ref === null
				? null
				: expectString(raw.scale_test_evidence_ref, 'scale_test_evidence_ref');

	const out: PackageMetadataResponse = { ok: true, package: pkg, cksum, is_official };
	if (facets) out.facets = facets;
	if (scale_classes_supported) out.scale_classes_supported = scale_classes_supported;
	if (scale_tested !== undefined) out.scale_tested = scale_tested;
	if (scale_test_evidence_ref !== undefined) out.scale_test_evidence_ref = scale_test_evidence_ref;
	return out;
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
		const is_official = expectBool(p.is_official, 'is_official');
		const latest = p.latest === undefined ? undefined : expectString(p.latest, 'latest');
		return { name, is_official, latest };
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
		const is_official = expectBool(p.is_official, 'is_official');
		const latest_version = expectOptionalString(p.latest_version, 'latest_version');
		const description = expectOptionalString(p.description, 'description');
		const modules_count = p.modules_count === undefined || p.modules_count === null ? undefined : expectNumber(p.modules_count, 'modules_count');
		return { name, is_official, latest_version, description, modules_count };
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

export function decodeAuthSessionResponse(raw: unknown): AuthSessionResponse {
	if (!isRecord(raw)) throw new Error('auth session response must be an object');
	if (raw.ok !== true) throw new Error('auth session response ok must be true');
	const authenticated = expectBool(raw.authenticated, 'authenticated');
	if (!authenticated) return { ok: true, authenticated: false };
	const csrf_token = expectString(raw.csrf_token, 'csrf_token');
	if (!isRecord(raw.user)) throw new Error('user must be an object');
	const userRaw = raw.user as Record<string, unknown>;
	const id = expectString(userRaw.id, 'id');
	const handle = expectString(userRaw.handle, 'handle');
	const github_user_id = expectOptionalNumber(userRaw.github_user_id, 'github_user_id');
	const github_login = expectOptionalString(userRaw.github_login, 'github_login');
	const avatar_url = expectOptionalString(userRaw.avatar_url, 'avatar_url');
	const profile_url = expectOptionalString(userRaw.profile_url, 'profile_url');
	const email = expectOptionalString(userRaw.email, 'email');
	const email_verified = expectBool(userRaw.email_verified, 'email_verified');
	const email_primary = expectBool(userRaw.email_primary, 'email_primary');
	const is_admin = expectBool(userRaw.is_admin, 'is_admin');
	const scopes = expectStringArray(userRaw.scopes, 'scopes');
	return {
		ok: true,
		authenticated: true,
		csrf_token,
		user: {
			id,
			handle,
			github_user_id,
			github_login,
			avatar_url,
			profile_url,
			email,
			email_verified,
			email_primary,
			is_admin,
			scopes
		}
	};
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

export function decodeAdvisoriesResponse(raw: unknown): AdvisoriesResponse {
	if (!isRecord(raw)) throw new Error('advisories response must be an object');
	if (raw.ok !== true) throw new Error('advisories response ok must be true');
	const name = expectString(raw.name, 'name');
	const version = expectString(raw.version, 'version');
	const advisoriesRaw = raw.advisories;
	if (!Array.isArray(advisoriesRaw)) throw new Error('advisories must be an array');
	const advisories = advisoriesRaw.map(decodePkgAdvisory);
	return { ok: true, name, version, advisories };
}

export function decodeAdvisoryCreateResponse(raw: unknown): AdvisoryCreateResponse {
	if (!isRecord(raw)) throw new Error('advisory create response must be an object');
	if (raw.ok !== true) throw new Error('advisory create response ok must be true');
	return { ok: true, advisory: decodePkgAdvisory(raw.advisory) };
}

export function decodeAdvisoryWithdrawResponse(raw: unknown): AdvisoryWithdrawResponse {
	if (!isRecord(raw)) throw new Error('advisory withdraw response must be an object');
	if (raw.ok !== true) throw new Error('advisory withdraw response ok must be true');
	return { ok: true, advisory: decodePkgAdvisory(raw.advisory) };
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
	const is_official = expectBool(raw.is_official, 'is_official');
	const owners = expectStringArray(raw.owners, 'owners');
	return { ok: true, name, is_official, owners };
}

export function decodeYankResponse(raw: unknown): YankResponse {
	if (!isRecord(raw)) throw new Error('yank response must be an object');
	if (raw.ok !== true) throw new Error('yank response ok must be true');
	const name = expectString(raw.name, 'name');
	const version = expectString(raw.version, 'version');
	const yanked = expectBool(raw.yanked, 'yanked');
	return { ok: true, name, version, yanked };
}
