<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import { getCatalog, getIndexConfig } from '$lib/api/registry';
	import type { ApiError, Catalog, CatalogPackage, IndexConfig } from '$lib/api/types';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';
	import { isOfficialPackage } from '$lib/ui/official';

	let q = $state('');
	let catalog = $state<Catalog | null>(null);
	let indexConfig = $state<IndexConfig | null>(null);
	let error = $state<ApiError | null>(null);

	onMount(async () => {
		try {
			const [c, cfg] = await Promise.all([getCatalog(), getIndexConfig()]);
			catalog = c;
			indexConfig = cfg;
		} catch (err) {
			error = errorToApiError(err);
		}
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const query = q.trim();
		void goto(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
	}

	let results = $derived.by(() => {
		if (!catalog) return [] as CatalogPackage[];
		if (!q.trim()) return catalog.packages;
		const needle = q.trim().toLowerCase();
		return catalog.packages.filter((p) => p.name.includes(needle));
	});
</script>

<h1>Browse</h1>

<form onsubmit={submit} class="card" style="margin-top: 1rem;">
	<label for="q">Filter</label>
	<input id="q" name="q" type="search" placeholder="type to filter…" bind:value={q} />
	<div style="margin-top: 0.75rem; display: flex; gap: 0.75rem;">
		<button class="btn" type="submit">Open search</button>
	</div>
</form>

{#if error}
	<div class="card" style="margin-top: 1rem;">
		<ErrorBox title="Catalog unavailable" {error} />
	</div>
{:else if !catalog}
	<p class="muted">Loading…</p>
{:else}
	<p class="muted">{results.length} package(s)</p>
	<div class="card">
		<table>
			<thead>
				<tr>
					<th>Package</th>
					<th>Latest</th>
				</tr>
			</thead>
			<tbody>
				{#each results as pkg}
					<tr>
						<td>
							<a href={`/packages/${pkg.name}`}>{pkg.name}</a>
							{#if isOfficialPackage(pkg.name, indexConfig?.verified_namespaces)}
								<span class="badge" style="margin-left: 0.5rem;">official</span>
							{/if}
						</td>
						<td class="muted">{pkg.latest ? `v${pkg.latest}` : ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
