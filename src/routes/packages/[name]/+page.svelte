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

<h1>Package: {name}</h1>

{#if error}
	<div class="card">
		<ErrorBox {error} />
	</div>
{:else if !entries}
	<p class="muted">Loading…</p>
{:else}
	<div class="grid">
		<section class="card">
			<h2>Overview</h2>
			{#if isOfficialPackage(name, indexConfig?.verified_namespaces)}
				<p class="muted">
					<span class="badge">official</span>
				</p>
			{/if}
			<p class="muted">Latest: {latest ?? 'none'}</p>
			{#if owners}
				<p class="muted">
					Owners: <code class="code-inline">{owners.owners.join(', ') || '(none)'}</code>
				</p>
			{/if}
			{#if latestMeta}
				{#if latestMeta.package.description}
					<p class="muted">{latestMeta.package.description}</p>
				{/if}
				<p class="muted">
					Manifest schema: <code class="code-inline">{latestMeta.package.schema_version}</code>
				</p>
				<p class="muted">
					Modules ({latestMeta.package.modules.length}): <code class="code-inline">{latestMeta.package.module_root}</code>
				</p>
			{/if}

			{#if latestDownload}
				<p>
					<a class="btn" href={latestDownload} rel="nofollow">Download latest</a>
				</p>
			{/if}
		</section>

		<section class="card">
			<h2>Quickstart</h2>
			{#if installSnippet}<CopyCode label="Copy install commands" code={installSnippet} />{/if}
			{#if importSnippet}<CopyCode label="Copy module IDs" code={importSnippet} />{/if}
			{#if verifySnippet}<CopyCode label="Copy verify snippet" code={verifySnippet} />{/if}
			{#if latestMeta}
				<CopyJson label="Copy latest metadata JSON" value={latestMeta} />
			{/if}
		</section>
	</div>

	<section class="card" style="margin-top: 1rem;">
		<h2>Versions</h2>
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
								<span class="badge">ok</span>
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
	.code-inline {
		font-family: var(--mono);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
