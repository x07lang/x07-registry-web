function normalizeBaseUrl(url: string): string {
	let trimmed = url.trim();
	if (!trimmed) trimmed = 'https://index.x07.io/';
	if (!trimmed.endsWith('/')) trimmed = `${trimmed}/`;
	return trimmed;
}

export const INDEX_BASE = normalizeBaseUrl(import.meta.env.PUBLIC_X07_INDEX_BASE ?? '');
export const CATALOG_PATH = (import.meta.env.PUBLIC_X07_CATALOG_PATH ?? 'catalog.json').replace(
	/^\/+/,
	''
);

export const DEFAULT_TIMEOUT_MS = 10_000;
