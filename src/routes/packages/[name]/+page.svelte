<script lang="ts">
	import { page } from '$app/state';

	import { ApiClientError } from '$lib/api/client';
	import {
		getOwners,
		getDownloadUrl,
		getIndexEntries,
		getPackageMetadata,
		latestNonYankedVersion,
		validatePackageName
	} from '$lib/api/registry';
	import type { IndexEntry, OwnersResponse, PackageMetadataResponse } from '$lib/api/types';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import CopyJson from '$lib/ui/components/CopyJson.svelte';

	let name = $derived(page.params.name ?? '');

	let entries = $state<IndexEntry[] | null>(null);
	let latest = $state<string | null>(null);
	let latestMeta = $state<PackageMetadataResponse | null>(null);
	let latestDownload = $state<string | null>(null);
	let owners = $state<OwnersResponse | null>(null);
	let error = $state<string | null>(null);

	$effect(() => {
		const pkgName = name;

		entries = null;
		latest = null;
		latestMeta = null;
		latestDownload = null;
		owners = null;
		error = null;

		if (!pkgName) {
			error = 'missing package name';
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				validatePackageName(pkgName);
				const [gotEntries, gotOwners] = await Promise.all([getIndexEntries(pkgName), getOwners(pkgName)]);
				if (cancelled) return;
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
				if (err instanceof ApiClientError) error = `${err.apiError.code}: ${err.apiError.message}`;
				else error = err instanceof Error ? err.message : String(err);
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	let installSnippet = $derived.by(() => {
		if (!latest || !latestDownload) return '';
		const expected =
			(entries ?? []).find((e) => e.version === latest)?.cksum ?? '<unknown>';
		return `# Download and verify\\n\\ncurl -fsSL ${latestDownload} -o ${name}-${latest}.tar\\n# Expected sha256: ${expected}\\n`;
	});
</script>

<h1>Package: {name}</h1>

{#if error}
	<div class="card">
		<p class="muted">{error}</p>
	</div>
{:else if !entries}
	<p class="muted">Loading…</p>
{:else}
	<div class="grid">
		<section class="card">
			<h2>Overview</h2>
			<p class="muted">Latest: {latest ?? 'none'}</p>
			{#if owners}
				<p class="muted">
					Owners: <code class="code-inline">{owners.owners.join(', ') || '(none)'}</code>
				</p>
			{/if}
			{#if latestMeta}
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
			<h2>Agent panel</h2>
			{#if installSnippet}
				<CopyCode label="Copy install snippet" code={installSnippet} />
			{/if}
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
				{#each [...entries].reverse() as e}
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
