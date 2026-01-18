export type ApiError = {
	code: string;
	message: string;
	url?: string;
	httpStatus?: number;
	request_id?: string;
};

export type IndexConfig = {
	dl: string;
	api: string;
	auth_required: boolean;
	sparse: true;
	verified_namespaces?: string[];
};

export type IndexEntry = {
	schema_version: 'x07.index-entry@0.1.0';
	name: string;
	version: string;
	cksum: string;
	yanked: boolean;
};

export type PackageManifest = {
	schema_version: string;
	name: string;
	description?: string;
	version: string;
	module_root: string;
	modules: string[];
};

export type PackageMetadataResponse = {
	ok: true;
	package: PackageManifest;
	cksum: string;
};

export type CatalogPackage = {
	name: string;
	latest?: string;
};

export type Catalog = {
	schema_version: 'x07.index-catalog@0.1.0';
	packages: CatalogPackage[];
};

export type SearchHit = {
	name: string;
	latest_version?: string;
	description?: string;
	modules_count?: number;
};

export type SearchResponse = {
	ok: true;
	q: string;
	limit: number;
	offset: number;
	total: number;
	packages: SearchHit[];
};

export type AccountResponse = {
	ok: true;
	user_id: string;
	handle: string;
	token_id: string;
	scopes: string[];
};

export type AuthSessionUser = {
	id: string;
	handle: string;
	github_user_id?: number;
	github_login?: string;
	avatar_url?: string;
	profile_url?: string;
	email?: string;
	email_verified: boolean;
	email_primary: boolean;
	is_admin: boolean;
	scopes: string[];
};

export type AuthSessionResponse = {
	ok: true;
	authenticated: boolean;
	csrf_token?: string;
	user?: AuthSessionUser;
};

export type TokenInfo = {
	id: string;
	label: string;
	scopes: string[];
	created_at: string;
	last_used_at?: string;
	revoked_at?: string;
};

export type TokenListResponse = {
	ok: true;
	tokens: TokenInfo[];
};

export type TokenCreateResponse = {
	ok: true;
	token_id: string;
	token: string;
	scopes: string[];
};

export type SimpleOkResponse = {
	ok: true;
};

export type OwnersResponse = {
	ok: true;
	name: string;
	owners: string[];
};

export type YankResponse = {
	ok: true;
	name: string;
	version: string;
	yanked: boolean;
};
