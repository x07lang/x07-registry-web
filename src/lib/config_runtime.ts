import { ApiClientError } from '$lib/api/client';

export type RegistryWebRuntimeConfig = {
	schema: 'x07.registry_web_config@v1';
	index_base: string;
	catalog_path: string;
	openapi_url: string;
};

export const RUNTIME_CONFIG_URL = '/x07-registry-web-config.json';

let runtimeConfigPromise: Promise<RegistryWebRuntimeConfig> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, field: string): string {
	if (typeof value !== 'string') throw new Error(`${field} must be a string`);
	return value;
}

function normalizeIndexBase(raw: string): string {
	let trimmed = raw.trim();
	if (!trimmed) throw new Error('index_base must be non-empty');
	if (!trimmed.endsWith('/')) trimmed = `${trimmed}/`;
	try {
		new URL(trimmed);
	} catch {
		throw new Error(`index_base must be a valid URL: ${trimmed}`);
	}
	return trimmed;
}

function normalizeCatalogPath(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('catalog_path must be non-empty');
	return trimmed.replace(/^\/+/, '');
}

function normalizeOpenApiUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('openapi_url must be non-empty');
	if (trimmed.startsWith('/')) return trimmed;
	return `/${trimmed}`;
}

async function fetchRuntimeConfig(): Promise<RegistryWebRuntimeConfig> {
	const url = RUNTIME_CONFIG_URL;
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), 5000);
	try {
		const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
		const text = await resp.text();
		if (!resp.ok) {
			throw new ApiClientError({
				code: 'X07WEB_MISCONFIG',
				message: `failed to load runtime config: HTTP ${resp.status}`,
				url,
				httpStatus: resp.status
			});
		}

		let raw: unknown;
		try {
			raw = JSON.parse(text);
		} catch (err) {
			throw new ApiClientError({
				code: 'X07WEB_MISCONFIG',
				message: err instanceof Error ? `runtime config was not valid JSON: ${err.message}` : 'runtime config was not valid JSON',
				url
			});
		}

		if (!isRecord(raw)) {
			throw new ApiClientError({
				code: 'X07WEB_MISCONFIG',
				message: 'runtime config must be an object',
				url
			});
		}

		const schema = expectString(raw.schema, 'schema');
		if (schema !== 'x07.registry_web_config@v1') {
			throw new ApiClientError({
				code: 'X07WEB_MISCONFIG',
				message: `unsupported runtime config schema: ${schema}`,
				url
			});
		}

		const index_base = normalizeIndexBase(expectString(raw.index_base, 'index_base'));
		const catalog_path = normalizeCatalogPath(expectString(raw.catalog_path, 'catalog_path'));
		const openapi_url = normalizeOpenApiUrl(expectString(raw.openapi_url, 'openapi_url'));

		return { schema: 'x07.registry_web_config@v1', index_base, catalog_path, openapi_url };
	} catch (err) {
		if (err instanceof ApiClientError) throw err;
		if (err instanceof DOMException && err.name === 'AbortError') {
			throw new ApiClientError({
				code: 'X07WEB_MISCONFIG',
				message: 'runtime config request timed out',
				url
			});
		}
		throw new ApiClientError({
			code: 'X07WEB_MISCONFIG',
			message: err instanceof Error ? err.message : String(err),
			url
		});
	} finally {
		clearTimeout(t);
	}
}

export function getRegistryWebConfig(): Promise<RegistryWebRuntimeConfig> {
	if (runtimeConfigPromise) return runtimeConfigPromise;
	runtimeConfigPromise = fetchRuntimeConfig();
	return runtimeConfigPromise;
}

