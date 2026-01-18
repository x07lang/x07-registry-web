import { compare as semverCompare, valid as semverValid } from 'semver';

import { getRegistryWebConfig } from '$lib/config_runtime';

import { ApiClientError, fetchJson, fetchText } from './client';
import {
	decodeAuthSessionResponse,
	decodeCatalog,
	decodeIndexConfig,
	decodeIndexEntry,
	decodeOwnersResponse,
	decodePackageMetadataResponse,
	decodeSearchResponse,
	decodeSimpleOkResponse,
	decodeTokenCreateResponse,
	decodeTokenListResponse,
	decodeYankResponse
} from './decode';
import type {
	AuthSessionResponse,
	Catalog,
	IndexConfig,
	IndexEntry,
	OwnersResponse,
	PackageMetadataResponse,
	SearchResponse,
	SimpleOkResponse,
	TokenCreateResponse,
	TokenListResponse,
	YankResponse
} from './types';

let indexConfigPromise: Promise<IndexConfig> | null = null;
const indexEntriesPromiseByName = new Map<string, Promise<IndexEntry[]>>();
const ownersPromiseByName = new Map<string, Promise<OwnersResponse>>();
const packageMetadataPromiseByKey = new Map<string, Promise<PackageMetadataResponse>>();

async function indexUrl(path: string): Promise<string> {
	const cfg = await getRegistryWebConfig();
	return new URL(path.replace(/^\/+/, ''), cfg.index_base).toString();
}

export async function getIndexConfig(): Promise<IndexConfig> {
	if (indexConfigPromise) return indexConfigPromise;
	indexConfigPromise = (async () => {
		const cfg = await getRegistryWebConfig();
		return fetchJson(new URL('config.json', cfg.index_base).toString(), decodeIndexConfig);
	})();
	return indexConfigPromise;
}

export async function getCatalog(): Promise<Catalog> {
	const cfg = await getRegistryWebConfig();
	return fetchJson(new URL(cfg.catalog_path, cfg.index_base).toString(), decodeCatalog);
}

export function validatePackageName(name: string): void {
	if (!name) throw new Error('package name must be non-empty');
	if (!/^[a-z][a-z0-9_-]*$/.test(name)) {
		throw new Error('package name must match ^[a-z][a-z0-9_-]*$');
	}
}

export function indexRelativePath(name: string): string {
	validatePackageName(name);
	const bytes = name.length;
	if (bytes === 1) return `1/${name}`;
	if (bytes === 2) return `2/${name}`;
	if (bytes === 3) return `3/${name[0]}/${name}`;
	return `${name.slice(0, 2)}/${name.slice(2, 4)}/${name}`;
}

export async function getIndexEntries(name: string): Promise<IndexEntry[]> {
	const existing = indexEntriesPromiseByName.get(name);
	if (existing) return existing;

	const p = (async () => {
		const url = await indexUrl(indexRelativePath(name));
		const text = await fetchText(url);
		const out: IndexEntry[] = [];
		for (const [idx, line] of text.split('\n').entries()) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			let raw: unknown;
			try {
				raw = JSON.parse(trimmed);
			} catch (err) {
				throw new ApiClientError({
					code: 'X07WEB_BAD_INDEX',
					message: `invalid ndjson line ${idx + 1}`,
					url
				});
			}
			try {
				out.push(decodeIndexEntry(raw));
			} catch (err) {
				throw new ApiClientError({
					code: 'X07WEB_BAD_INDEX',
					message: err instanceof Error ? `invalid index entry line ${idx + 1}: ${err.message}` : `invalid index entry line ${idx + 1}`,
					url
				});
			}
		}
		return out;
	})();

	indexEntriesPromiseByName.set(name, p);
	try {
		return await p;
	} catch (err) {
		indexEntriesPromiseByName.delete(name);
		throw err;
	}
}

export function latestNonYankedVersion(entries: IndexEntry[]): string | null {
	let best: string | null = null;
	for (const entry of entries) {
		if (entry.yanked) continue;
		if (!semverValid(entry.version)) continue;
		if (best === null || semverCompare(entry.version, best) > 0) best = entry.version;
	}
	return best;
}

export async function getPackageMetadata(
	name: string,
	version: string
): Promise<PackageMetadataResponse> {
	const key = `${name}@${version}`;
	const existing = packageMetadataPromiseByKey.get(key);
	if (existing) return existing;

	const p = (async () => {
		const cfg = await getIndexConfig();
		const url = new URL(`packages/${name}/${version}/metadata`, cfg.api).toString();
		return fetchJson(url, decodePackageMetadataResponse);
	})();

	packageMetadataPromiseByKey.set(key, p);
	try {
		return await p;
	} catch (err) {
		packageMetadataPromiseByKey.delete(key);
		throw err;
	}
}

export async function getDownloadUrl(name: string, version: string): Promise<string> {
	const cfg = await getIndexConfig();
	return new URL(`${name}/${version}/download`, cfg.dl).toString();
}

export async function searchPackages(q: string, limit = 20, offset = 0): Promise<SearchResponse> {
	const cfg = await getIndexConfig();
	const url = new URL('search', cfg.api);
	if (q.trim()) url.searchParams.set('q', q.trim());
	url.searchParams.set('limit', String(limit));
	url.searchParams.set('offset', String(offset));
	return fetchJson(url.toString(), decodeSearchResponse);
}

export async function getOwners(name: string): Promise<OwnersResponse> {
	const existing = ownersPromiseByName.get(name);
	if (existing) return existing;

	const p = (async () => {
		const cfg = await getIndexConfig();
		const url = new URL(`packages/${name}/owners`, cfg.api).toString();
		return fetchJson(url, decodeOwnersResponse);
	})();

	ownersPromiseByName.set(name, p);
	try {
		return await p;
	} catch (err) {
		ownersPromiseByName.delete(name);
		throw err;
	}
}

export async function getAuthSession(): Promise<AuthSessionResponse> {
	const cfg = await getIndexConfig();
	const url = new URL('auth/session', cfg.api).toString();
	return fetchJson(url, decodeAuthSessionResponse, undefined, {
		credentials: 'include'
	});
}

export async function logout(csrfToken: string): Promise<void> {
	const cfg = await getIndexConfig();
	const url = new URL('auth/logout', cfg.api).toString();
	await fetchText(url, 10_000, {
		method: 'POST',
		credentials: 'include',
		headers: { 'X-X07-CSRF': csrfToken }
	});
}

export async function listTokens(): Promise<TokenListResponse> {
	const cfg = await getIndexConfig();
	const url = new URL('tokens', cfg.api).toString();
	return fetchJson(url, decodeTokenListResponse, undefined, { credentials: 'include' });
}

export async function createToken(
	label: string,
	scopes: string[],
	csrfToken: string
): Promise<TokenCreateResponse> {
	const cfg = await getIndexConfig();
	const url = new URL('tokens', cfg.api).toString();
	return fetchJson(url, decodeTokenCreateResponse, undefined, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json', 'X-X07-CSRF': csrfToken },
		body: JSON.stringify({ label, scopes })
	});
}

export async function revokeToken(
	tokenId: string,
	csrfToken: string
): Promise<SimpleOkResponse> {
	const cfg = await getIndexConfig();
	const url = new URL(`tokens/${tokenId}/revoke`, cfg.api).toString();
	return fetchJson(url, decodeSimpleOkResponse, undefined, {
		method: 'POST',
		credentials: 'include',
		headers: { 'X-X07-CSRF': csrfToken }
	});
}

export async function yankVersion(
	name: string,
	version: string,
	yanked: boolean,
	csrfToken: string
): Promise<YankResponse> {
	const cfg = await getIndexConfig();
	const url = new URL(`packages/${name}/${version}/yank`, cfg.api).toString();
	return fetchJson(url, decodeYankResponse, undefined, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json', 'X-X07-CSRF': csrfToken },
		body: JSON.stringify({ yanked })
	});
}
