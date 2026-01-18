import { env } from '$env/dynamic/public';

function normalizeBaseUrl(url: string): string {
	let trimmed = url.trim();
	if (!trimmed) trimmed = 'https://registry.x07.io/index/';
	if (!trimmed.endsWith('/')) trimmed = `${trimmed}/`;
	return trimmed;
}

export const INDEX_BASE = normalizeBaseUrl(env.PUBLIC_X07_INDEX_BASE ?? '');
export const CATALOG_PATH = (env.PUBLIC_X07_CATALOG_PATH ?? 'catalog.json').replace(
	/^\/+/,
	''
);

export const DEFAULT_TIMEOUT_MS = 10_000;
