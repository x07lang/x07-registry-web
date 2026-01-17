import { DEFAULT_TIMEOUT_MS } from '$lib/config';
import type { ApiError } from './types';

export class ApiClientError extends Error {
	public readonly apiError: ApiError;

	constructor(apiError: ApiError) {
		super(apiError.message);
		this.apiError = apiError;
	}
}

function normalizeError(err: unknown, url: string): ApiError {
	if (err instanceof ApiClientError) return err.apiError;
	if (err instanceof DOMException && err.name === 'AbortError') {
		return { code: 'X07WEB_TIMEOUT', message: 'request timed out', url };
	}
	if (err instanceof Error) {
		return { code: 'X07WEB_NETWORK', message: err.message, url };
	}
	return { code: 'X07WEB_UNKNOWN', message: String(err), url };
}

export async function fetchText(
	url: string,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	init: RequestInit = {}
): Promise<string> {
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const resp = await fetch(url, { ...init, signal: controller.signal });
		if (!resp.ok) {
			throw new ApiClientError({
				code: 'X07WEB_HTTP',
				message: `HTTP ${resp.status}`,
				url,
				httpStatus: resp.status
			});
		}
		return await resp.text();
	} catch (err) {
		throw new ApiClientError(normalizeError(err, url));
	} finally {
		clearTimeout(t);
	}
}

export async function fetchJson<T>(
	url: string,
	decode: (raw: unknown) => T,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	init: RequestInit = {}
): Promise<T> {
	const text = await fetchText(url, timeoutMs, init);
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (err) {
		throw new ApiClientError({
			code: 'X07WEB_BAD_JSON',
			message: err instanceof Error ? err.message : 'response was not valid JSON',
			url
		});
	}
	try {
		return decode(raw);
	} catch (err) {
		throw new ApiClientError({
			code: 'X07WEB_BAD_RESPONSE',
			message: err instanceof Error ? err.message : 'response did not match expected schema',
			url
		});
	}
}
