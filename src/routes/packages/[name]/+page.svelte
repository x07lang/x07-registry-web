<script lang="ts">
	import { page } from '$app/state';
	import { compare as semverCompare, valid as semverValid } from 'semver';

	import {
		getIndexConfig,
		getOwners,
		getDownloadUrl,
		getIndexEntries,
		getPackageMetadata,
		latestNonYankedVersion,
		validatePackageName
	} from '$lib/api/registry';
	import type { ApiError, IndexConfig, IndexEntry, OwnersResponse, PackageMetadataResponse } from '$lib/api/types';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';
	import { isOfficialPackage } from '$lib/ui/official';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import CopyJson from '$lib/ui/components/CopyJson.svelte';

	let name = $derived(page.params.name ?? '');

	let indexConfig = $state<IndexConfig | null>(null);
	let entries = $state<IndexEntry[] | null>(null);
	let latest = $state<string | null>(null);
	let latestMeta = $state<PackageMetadataResponse | null>(null);
	let latestDownload = $state<string | null>(null);
	let owners = $state<OwnersResponse | null>(null);
	let error = $state<ApiError | null>(null);

	$effect(() => {
		const pkgName = name;

		indexConfig = null;
		entries = null;
		latest = null;
		latestMeta = null;
		latestDownload = null;
		owners = null;
		error = null;

		if (!pkgName) {
			error = { code: 'X07WEB_INPUT', message: 'missing package name' };
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				validatePackageName(pkgName);
				const [cfg, gotEntries, gotOwners] = await Promise.all([
					getIndexConfig(),
					getIndexEntries(pkgName),
					getOwners(pkgName)
				]);
				if (cancelled) return;
				indexConfig = cfg;
				entries = gotEntries;
				owners = gotOwners;
				const latestVer = latestNonYankedVersion(gotEntries);
				latest = latestVer;
				if (latestVer) {
					const [meta, dl] = await Promise.all([
						getPackageMetadata(pkgName, latestVer),
						getDownloadUrl(pkgName, latestVer)
					]);
					if (cancelled) return;
					latestMeta = meta;
					latestDownload = dl;
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

	let sortedEntries = $derived.by(() => {
		if (!entries) return [] as IndexEntry[];
		return [...entries].sort((a, b) => {
			const av = semverValid(a.version);
			const bv = semverValid(b.version);
			if (av && bv) {
				const c = semverCompare(b.version, a.version);
				if (c !== 0) return c;
			} else if (av && !bv) {
				return -1;
			} else if (!av && bv) {
				return 1;
			}
			if (a.version < b.version) return 1;
			if (a.version > b.version) return -1;
			return 0;
		});
	});

	let installSnippet = $derived.by(() => {
		if (!latest) return '';
		return `x07 pkg add ${name}@${latest}\nx07 pkg lock\n`;
	});

	let importSnippet = $derived.by(() => {
		const modules = latestMeta?.package.modules ?? [];
		if (modules.length === 0) return '';
		return `# Module IDs (import these from your program)\n${modules.map((m) => `- ${m}`).join('\n')}\n`;
	});

	let verifySnippet = $derived.by(() => {
		if (!latest || !latestDownload) return '';
		const expected = (entries ?? []).find((e) => e.version === latest)?.cksum ?? '<unknown>';
		const filename = `${name}-${latest}.tar`;
		return `# Download and verify\n\ncurl -fsSL ${latestDownload} -o ${filename}\nshasum -a 256 ${filename}\n# expected: ${expected}\n`;
	});
</script>

<div class="page-header">
	<div class="page-header__top">
		<h1>{name}</h1>
		{#if isOfficialPackage(name, indexConfig?.verified_namespaces)}
			<span class="badge badge--accent">official</span>
		{/if}
	</div>
	{#if latestMeta?.package.description}
		<p class="page-header__desc">{latestMeta.package.description}</p>
	{/if}
</div>

{#if error}
	<div class="card">
		<ErrorBox {error} />
	</div>
{:else if !entries}
	<p class="muted loading">Loading package…</p>
{:else}
	<div class="grid">
		<section class="card">
			<h2>Overview</h2>
			<div class="meta-list">
				<div class="meta-item">
					<span class="meta-label">Latest version</span>
					<span class="meta-value">{latest ?? '—'}</span>
				</div>
				{#if owners}
					<div class="meta-item">
						<span class="meta-label">Owners</span>
						<span class="meta-value"><code class="code-inline">{owners.owners.join(', ') || '(none)'}</code></span>
					</div>
				{/if}
				{#if latestMeta}
					<div class="meta-item">
						<span class="meta-label">Schema version</span>
						<span class="meta-value"><code class="code-inline">{latestMeta.package.schema_version}</code></span>
					</div>
					<div class="meta-item">
						<span class="meta-label">Modules</span>
						<span class="meta-value">{latestMeta.package.modules.length} in <code class="code-inline">{latestMeta.package.module_root}</code></span>
					</div>
				{/if}
			</div>

			{#if latestDownload}
				<div class="card-actions">
					<a class="btn btn--primary" href={latestDownload} rel="nofollow">Download v{latest}</a>
				</div>
			{/if}
		</section>

		<section class="card">
			<h2>Quick start</h2>
			<div class="snippets">
				{#if installSnippet}<CopyCode label="Copy install commands" code={installSnippet} />{/if}
				{#if importSnippet}<CopyCode label="Copy module IDs" code={importSnippet} />{/if}
				{#if verifySnippet}<CopyCode label="Copy verify snippet" code={verifySnippet} />{/if}
				{#if latestMeta}
					<CopyJson label="Copy latest metadata JSON" value={latestMeta} />
				{/if}
			</div>
		</section>
	</div>

	<section class="card versions-card">
		<div class="versions-header">
			<h2>Versions</h2>
			<span class="muted">{sortedEntries.length} release{sortedEntries.length === 1 ? '' : 's'}</span>
		</div>
		<table>
			<thead>
				<tr>
					<th>Version</th>
					<th>Status</th>
					<th>Checksum</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedEntries as e}
					<tr>
						<td>
							<a href={`/packages/${name}/versions/${e.version}`}>{e.version}</a>
						</td>
						<td>
							{#if e.yanked}
								<span class="badge badge--yanked">yanked</span>
							{:else}
								<span class="badge badge--accent">ok</span>
							{/if}
						</td>
						<td class="muted"><code class="code-inline">{e.cksum.slice(0, 12)}…</code></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

<style>
	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header__top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.page-header__top h1 {
		margin: 0;
		font-family: var(--mono);
		font-size: 1.75rem;
	}

	.page-header__desc {
		margin: 0.5rem 0 0;
		color: var(--muted);
		font-size: 1.05rem;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.meta-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.meta-item {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.meta-item:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.meta-label {
		font-size: 0.9rem;
		color: var(--muted);
	}

	.meta-value {
		font-size: 0.9rem;
		text-align: right;
	}

	.card-actions {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
	}

	.snippets {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.versions-card {
		margin-top: 1.5rem;
	}

	.versions-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.versions-header h2 {
		margin: 0;
	}

	.loading {
		padding: 2rem 0;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.meta-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.meta-value {
			text-align: left;
		}
	}
</style>
