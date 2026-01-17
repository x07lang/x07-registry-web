const TOKEN_KEY = 'x07.registry.token';

export function loadAuthToken(): string | null {
	if (typeof localStorage === 'undefined') return null;
	const raw = localStorage.getItem(TOKEN_KEY);
	if (!raw) return null;
	const token = raw.trim();
	return token ? token : null;
}

export function storeAuthToken(token: string): void {
	if (typeof localStorage === 'undefined') return;
	const trimmed = token.trim();
	if (!trimmed) return;
	localStorage.setItem(TOKEN_KEY, trimmed);
}

export function clearAuthToken(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(TOKEN_KEY);
}

