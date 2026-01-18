<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	import { loadAuthToken } from '$lib/auth';
	import {
		getAccount,
		getIndexConfig,
		getDownloadUrl,
		getIndexEntries,
		getPackageMetadata,
		validatePackageName,
		yankVersion
	} from '$lib/api/registry';
	import type { AccountResponse, ApiError, IndexConfig, IndexEntry, PackageMetadataResponse } from '$lib/api/types';
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
	let account = $state<AccountResponse | null>(null);
	let token = $state<string | null>(null);

	let error = $state<ApiError | null>(null);
	let yankError = $state<ApiError | null>(null);
	let yankBusy = $state(false);

	onMount(() => {
		token = loadAuthToken();
	});

	$effect(() => {
		const pkgName = name;
		const version = ver;

		entry = null;
		meta = null;
		downloadUrl = null;
		account = null;
		indexConfig = null;
		error = null;
		yankError = null;

		let cancelled = false;
		(async () => {
			try {
				validatePackageName(pkgName);
				const cfg = await getIndexConfig();
				if (cancelled) return;
				indexConfig = cfg;

				const entries = await getIndexEntries(pkgName);
				const found = entries.find((e) => e.version === version) ?? null;
				if (!found) throw new Error('version not found');
				entry = found;

				const [m, dl] = await Promise.all([getPackageMetadata(pkgName, version), getDownloadUrl(pkgName, version)]);
				if (cancelled) return;
				meta = m;
				downloadUrl = dl;

				if (token) {
					const acct = await getAccount(token);
					if (cancelled) return;
					account = acct;
				}
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
		return account?.scopes?.includes('owner.manage') ?? false;
	});

	let installSnippet = $derived.by(() => {
		if (!entry) return '';
		return `x07 pkg add ${name}@${ver}\nx07 pkg lock\n`;
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
		if (!token) {
			yankError = { code: 'X07WEB_AUTH', message: 'missing auth token (go to /settings/tokens)' };
			return;
		}
		if (!entry) return;

		yankBusy = true;
		yankError = null;
		try {
			await yankVersion(token, name, ver, !entry.yanked);
			const entries = await getIndexEntries(name);
			entry = entries.find((e) => e.version === ver) ?? entry;
		} catch (err) {
			yankError = errorToApiError(err);
		} finally {
			yankBusy = false;
		}
	}
</script>

<h1>{name}@{ver}</h1>

{#if error}
	<div class="card" style="margin-top: 1rem;">
		<ErrorBox {error} />
	</div>
{:else if !entry || !meta}
	<p class="muted">Loading…</p>
{:else}
	<div class="grid">
		<section class="card">
			<h2>Release</h2>
			{#if isOfficialPackage(name, indexConfig?.verified_namespaces)}
				<p class="muted">
					<span class="badge">official</span>
				</p>
			{/if}
			{#if meta.package.description}
				<p class="muted">{meta.package.description}</p>
			{/if}
			<p class="muted">
				Status:
				{#if entry.yanked}
					<span class="badge badge--yanked">yanked</span>
				{:else}
					<span class="badge">ok</span>
				{/if}
			</p>
			<p class="muted">Checksum</p>
			<div class="checksum">
				<code class="code-inline">{entry.cksum}</code>
				<CopyButton label="Copy sha256" text={entry.cksum} />
			</div>
			{#if entry.yanked}
				<hr class="divider" />
				<p class="muted">
					This version is yanked. It remains available for reproducibility, but should not be used for new installs.
				</p>
			{/if}
			{#if downloadUrl}
				<p>
					<a class="btn" href={downloadUrl} rel="nofollow">Download</a>
				</p>
			{/if}

			{#if canYank}
				<hr class="divider" />
				{#if yankError}
					<ErrorBox title="Yank failed" error={yankError} />
				{/if}
				<button class="btn" disabled={yankBusy} onclick={toggleYank}>
					{#if entry.yanked}Un-yank{:else}Yank{/if}
				</button>
			{/if}
		</section>

		<section class="card">
			<h2>Agent panel</h2>
			{#if installSnippet}
				<CopyCode label="Copy install commands" code={installSnippet} />
			{/if}
			{#if verifySnippet}
				<CopyCode label="Copy verify snippet" code={verifySnippet} />
			{/if}
			<CopyJson label="Copy metadata JSON" value={meta} />
		</section>
	</div>

	<section class="card" style="margin-top: 1rem;">
		<h2>Modules</h2>
		{#if modules.length === 0}
			<p class="muted">—</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Module ID</th>
						<th>Archive path</th>
						<th>Exports</th>
						<th>Copy</th>
					</tr>
				</thead>
				<tbody>
					{#each modules as m}
						<tr>
							<td><code class="code-inline">{m.moduleId}</code></td>
							<td><code class="code-inline">{m.archivePath}</code></td>
							<td class="muted">—</td>
							<td><CopyButton label="Copy module ID" text={m.moduleId} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<details class="card" style="margin-top: 1rem;">
		<summary class="summary">Manifest</summary>
		<CopyJson label="Copy x07-package.json" value={meta.package} />
	</details>
{/if}

<style>
	.code-inline {
		font-family: var(--mono);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border);
		margin: 1rem 0;
	}

	.checksum {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.summary {
		cursor: pointer;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
