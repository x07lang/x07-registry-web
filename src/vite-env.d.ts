/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly PUBLIC_X07_INDEX_BASE?: string;
	readonly PUBLIC_X07_CATALOG_PATH?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

