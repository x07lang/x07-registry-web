export function isOfficialPackage(name: string, verifiedNamespaces: string[] | undefined): boolean {
	const namespaces = [...(verifiedNamespaces ?? []), 'x07lang', 'x07'].filter((v) => v.trim());
	for (const ns of namespaces) {
		const trimmed = ns.trim();
		if (name === trimmed) return true;
		if (name.startsWith(`${trimmed}-`)) return true;
		if (name.startsWith(`${trimmed}/`)) return true;
	}
	return false;
}
