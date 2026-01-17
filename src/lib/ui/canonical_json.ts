function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		const keys = Object.keys(obj).sort();
		const out: Record<string, unknown> = {};
		for (const k of keys) out[k] = canonicalize(obj[k]);
		return out;
	}
	return value;
}

export function canonicalJson(value: unknown): string {
	return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

