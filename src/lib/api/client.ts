import type { ApiError } from './types';

const DEFAULT_TIMEOUT_MS = 10_000;

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
		const text = await resp.text();
		if (!resp.ok) {
			let parsed: unknown = undefined;
			try {
				parsed = JSON.parse(text);
			} catch {
				parsed = undefined;
			}
			if (
				isRecord(parsed) &&
				typeof parsed.code === 'string' &&
				typeof parsed.message === 'string'
			) {
				throw new ApiClientError({
					code: parsed.code,
					message: parsed.message,
					url,
					httpStatus: resp.status,
					request_id: typeof parsed.request_id === 'string' ? parsed.request_id : undefined
				});
			}

			throw new ApiClientError({
				code: 'X07WEB_HTTP',
				message: `HTTP ${resp.status}`,
				url,
				httpStatus: resp.status
			});
		}
		return text;
	} catch (err) {
		if (err instanceof ApiClientError) throw err;
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
