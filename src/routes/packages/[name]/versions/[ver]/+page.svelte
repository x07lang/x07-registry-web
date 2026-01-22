<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	import { getRegistryWebConfig } from '$lib/config_runtime';
	import {
		getAuthSession,
		getIndexConfig,
		getDownloadUrl,
		getIndexEntries,
		getPackageMetadata,
		validatePackageName,
		yankVersion
	} from '$lib/api/registry';
	import type {
		ApiError,
		AuthSessionUser,
		IndexConfig,
		IndexEntry,
		PackageMetadataResponse
	} from '$lib/api/types';
	import CopyButton from '$lib/ui/components/CopyButton.svelte';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';
	import { isOfficialPackage } from '$lib/ui/official';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import CopyJson from '$lib/ui/components/CopyJson.svelte';

	let name = $derived(page.params.name ?? '');
	let ver = $derived(page.params.ver ?? '');

	let indexConfig = $state<IndexConfig | null>(null);
	let entry = $state<IndexEntry | null>(null);
	let meta = $state<PackageMetadataResponse | null>(null);
	let downloadUrl = $state<string | null>(null);
	let indexBase = $state<string | null>(null);
	let user = $state<AuthSessionUser | null>(null);
	let csrfToken = $state<string | null>(null);

	let error = $state<ApiError | null>(null);
	let yankError = $state<ApiError | null>(null);
	let yankBusy = $state(false);

	onMount(() => {
		// Session is loaded as part of the main effect.
	});

	$effect(() => {
		const pkgName = name;
		const version = ver;

		entry = null;
		meta = null;
		downloadUrl = null;
		indexConfig = null;
		indexBase = null;
		user = null;
		csrfToken = null;
		error = null;
		yankError = null;

		let cancelled = false;
		(async () => {
			try {
				validatePackageName(pkgName);
				const [cfg, webCfg, session] = await Promise.all([
					getIndexConfig(),
					getRegistryWebConfig(),
					getAuthSession()
				]);
				if (cancelled) return;
				indexConfig = cfg;
				indexBase = webCfg.index_base;
				if (session.authenticated && session.user && session.csrf_token) {
					user = session.user;
					csrfToken = session.csrf_token;
				}

				const entries = await getIndexEntries(pkgName);
				const found = entries.find((e) => e.version === version) ?? null;
				if (!found) throw new Error('version not found');
				entry = found;

				const [m, dl] = await Promise.all([getPackageMetadata(pkgName, version), getDownloadUrl(pkgName, version)]);
				if (cancelled) return;
				meta = m;
				downloadUrl = dl;
			} catch (err) {
				if (cancelled) return;
				error = errorToApiError(err);
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	let canYank = $derived.by(() => {
		return user?.scopes?.includes('owner.manage') ?? false;
	});

	let installSnippet = $derived.by(() => {
		if (!entry) return '';
		const base = indexBase ?? '<index_base>';
		return `x07 pkg add ${name}@${ver} --sync --index sparse+${base}\n`;
	});

	let verifySnippet = $derived.by(() => {
		if (!entry || !downloadUrl) return '';
		const filename = `${name}-${ver}.tar`;
		return `# Download and verify\n\ncurl -fsSL ${downloadUrl} -o ${filename}\nshasum -a 256 ${filename}\n# expected: ${entry.cksum}\n`;
	});

	function moduleArchivePath(moduleId: string, moduleRoot: string): string {
		const trimmed = moduleId.trim();
		const rel = trimmed ? trimmed.split('.').join('/') : trimmed;
		return `${moduleRoot.replace(/\/+$/, '')}/${rel}.x07.json`;
	}

	let modules = $derived.by(() => {
		const pkg = meta?.package;
		if (!pkg) return [] as { moduleId: string; archivePath: string }[];
		return pkg.modules
			.slice()
			.sort((a, b) => a.localeCompare(b))
			.map((moduleId) => ({ moduleId, archivePath: moduleArchivePath(moduleId, pkg.module_root) }));
	});

	async function toggleYank() {
		if (!csrfToken) {
			yankError = { code: 'X07WEB_AUTH', message: 'not signed in (go to /settings/tokens)' };
			return;
		}
		if (!entry) return;

		yankBusy = true;
		yankError = null;
		try {
			await yankVersion(name, ver, !entry.yanked, csrfToken);
			const entries = await getIndexEntries(name);
			entry = entries.find((e) => e.version === ver) ?? entry;
		} catch (err) {
			yankError = errorToApiError(err);
		} finally {
			yankBusy = false;
		}
	}
</script>

<div class="page-header">
	<div class="breadcrumb muted">
		<a href="/packages">Packages</a>
		<span>/</span>
		<a href="/packages/{name}">{name}</a>
		<span>/</span>
		<span>v{ver}</span>
	</div>
	<div class="page-header__top">
		<h1><span class="pkg-name">{name}</span><span class="pkg-ver">@{ver}</span></h1>
		{#if entry?.yanked}
			<span class="badge badge--yanked">yanked</span>
		{:else if entry}
			<span class="badge badge--accent">ok</span>
		{/if}
		{#if isOfficialPackage(name, indexConfig?.verified_namespaces)}
			<span class="badge badge--accent">official</span>
		{/if}
	</div>
	{#if meta?.package.description}
		<p class="page-header__desc">{meta.package.description}</p>
	{/if}
	{#if meta?.package.docs}
		<pre class="page-header__docs">{meta.package.docs}</pre>
	{/if}
</div>

{#if error}
	<div class="card">
		<ErrorBox {error} />
	</div>
{:else if !entry || !meta}
	<p class="muted loading">Loading version details…</p>
{:else}
	<div class="grid">
		<section class="card">
			<h2>Release Details</h2>
			<div class="release-info">
				<div class="info-row">
					<span class="info-label">Checksum (SHA-256)</span>
					<div class="checksum">
						<code class="code-inline">{entry.cksum}</code>
						<CopyButton label="Copy" text={entry.cksum} />
					</div>
				</div>
			</div>

			{#if entry.yanked}
				<div class="yank-notice">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
					</svg>
					<span>This version is yanked. It remains available for reproducibility, but should not be used for new installs.</span>
				</div>
			{/if}

			<div class="release-actions">
				{#if downloadUrl}
					<a class="btn btn--primary" href={downloadUrl} rel="nofollow">Download v{ver}</a>
				{/if}
				<a class="btn btn--ghost" href="/packages/{name}">View all versions</a>
			</div>

			{#if canYank}
				<div class="yank-section">
					<h3>Owner Actions</h3>
					{#if yankError}
						<div style="margin-bottom: 1rem;">
							<ErrorBox title="Yank failed" error={yankError} />
						</div>
					{/if}
					<button class="btn" class:btn--yanked={!entry.yanked} disabled={yankBusy} onclick={toggleYank}>
						{#if entry.yanked}Un-yank version{:else}Yank version{/if}
					</button>
				</div>
			{/if}
		</section>

		<section class="card">
			<h2>Quick Start</h2>
			<div class="snippets">
				{#if installSnippet}
					<CopyCode label="Copy install commands" code={installSnippet} />
				{/if}
				{#if verifySnippet}
					<CopyCode label="Copy verify snippet" code={verifySnippet} />
				{/if}
				<CopyJson label="Copy metadata JSON" value={meta} />
			</div>
		</section>
	</div>

	<section class="card modules-card">
		<div class="modules-header">
			<h2>Modules</h2>
			<span class="muted">{modules.length} module{modules.length === 1 ? '' : 's'}</span>
		</div>
		{#if modules.length === 0}
			<p class="muted">No modules exported</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Module ID</th>
						<th>Archive path</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each modules as m}
						<tr>
							<td><code class="code-inline">{m.moduleId}</code></td>
							<td class="muted"><code>{m.archivePath}</code></td>
							<td class="action-cell"><CopyButton label="Copy" text={m.moduleId} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<details class="card manifest-card">
		<summary class="manifest-summary">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="9 18 15 12 9 6"></polyline>
			</svg>
			Package Manifest
		</summary>
		<div class="manifest-body">
			<CopyJson label="Copy x07-package.json" value={meta.package} />
		</div>
	</details>
{/if}

<style>
	.page-header {
		margin-bottom: 1.5rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
	}

	.breadcrumb a {
		color: var(--muted);
	}

	.breadcrumb a:hover {
		color: var(--accent);
	}

	.page-header__top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.page-header__top h1 {
		margin: 0;
	}

	.pkg-name {
		font-family: var(--mono);
	}

	.pkg-ver {
		color: var(--muted);
		font-weight: 400;
	}

	.page-header__desc {
		margin: 0.5rem 0 0;
		color: var(--muted);
		font-size: 1.05rem;
	}

	.page-header__docs {
		margin: 0.75rem 0 0;
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--muted);
		font-size: 0.9rem;
		white-space: pre-wrap;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.release-info {
		margin-bottom: 1.25rem;
	}

	.info-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-label {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.checksum {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.checksum .code-inline {
		font-size: 0.8rem;
		word-break: break-all;
	}

	.yank-notice {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		background: var(--danger-subtle);
		border: 1px solid rgba(248, 113, 113, 0.25);
		border-radius: var(--radius-sm);
		color: var(--danger);
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.yank-notice svg {
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.release-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.yank-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.yank-section h3 {
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.btn--yanked {
		border-color: rgba(248, 113, 113, 0.3);
		background: var(--danger-subtle);
		color: var(--danger);
	}

	.btn--yanked:hover {
		background: rgba(248, 113, 113, 0.2);
		border-color: rgba(248, 113, 113, 0.5);
		box-shadow: 0 0 16px rgba(248, 113, 113, 0.2);
	}

	.snippets {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.modules-card {
		margin-top: 1.5rem;
	}

	.modules-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.modules-header h2 {
		margin: 0;
	}

	.action-cell {
		text-align: right;
	}

	.manifest-card {
		margin-top: 1.5rem;
	}

	.manifest-summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: 600;
		color: var(--text-secondary);
		padding: 0.25rem 0;
	}

	.manifest-summary:hover {
		color: var(--text);
	}

	.manifest-summary svg {
		transition: transform var(--transition-fast);
	}

	details[open] .manifest-summary svg {
		transform: rotate(90deg);
	}

	.manifest-body {
		margin-top: 1rem;
	}

	.loading {
		padding: 2rem 0;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
