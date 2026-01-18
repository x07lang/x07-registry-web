import { ApiClientError } from '$lib/api/client';
import type { ApiError } from '$lib/api/types';

export function errorToApiError(err: unknown): ApiError {
	if (err instanceof ApiClientError) return err.apiError;
	if (err instanceof Error) return { code: 'X07WEB_UNKNOWN', message: err.message };
	return { code: 'X07WEB_UNKNOWN', message: String(err) };
}

