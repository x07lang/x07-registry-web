<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import { getCatalog } from '$lib/api/registry';
	import type { Catalog, CatalogPackage } from '$lib/api/types';

	let q = $state('');
	let catalog = $state<Catalog | null>(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			catalog = await getCatalog();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
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
	<p class="muted">catalog unavailable: {error}</p>
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
						<td><a href={`/packages/${pkg.name}`}>{pkg.name}</a></td>
						<td class="muted">{pkg.latest ? `v${pkg.latest}` : ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
