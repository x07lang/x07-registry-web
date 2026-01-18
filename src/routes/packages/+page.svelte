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

<div class="page-header">
	<h1>Browse Packages</h1>
	<p class="muted">Explore all packages in the X07 registry</p>
</div>

<div class="card filter-card">
	<form onsubmit={submit} class="filter-form">
		<div class="filter-field">
			<svg class="filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
			</svg>
			<input id="q" name="q" type="search" placeholder="Filter by name…" bind:value={q} />
		</div>
		<button class="btn btn--ghost" type="submit">Advanced search →</button>
	</form>
</div>

{#if error}
	<div class="card" style="margin-top: 1.5rem;">
		<ErrorBox title="Catalog unavailable" {error} />
	</div>
{:else if !catalog}
	<p class="muted loading">Loading packages…</p>
{:else}
	<div class="results-header">
		<span class="results-count">{results.length} package{results.length === 1 ? '' : 's'}</span>
	</div>
	<div class="card">
		<table>
			<thead>
				<tr>
					<th>Package</th>
					<th>Latest version</th>
				</tr>
			</thead>
			<tbody>
				{#each results as pkg}
					<tr>
						<td>
							<a href={`/packages/${pkg.name}`}>{pkg.name}</a>
							{#if isOfficialPackage(pkg.name, indexConfig?.verified_namespaces)}
								<span class="badge badge--accent">official</span>
							{/if}
						</td>
						<td class="muted">{pkg.latest ? `v${pkg.latest}` : '—'}</td>
					</tr>
				{/each}
				{#if results.length === 0}
					<tr>
						<td colspan="2" class="muted" style="text-align: center; padding: 2rem;">No packages match your filter</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header h1 {
		margin-bottom: 0.25rem;
	}

	.page-header p {
		margin: 0;
	}

	.filter-card {
		padding: 1rem 1.5rem;
	}

	.filter-form {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.filter-field {
		flex: 1;
		position: relative;
	}

	.filter-field input {
		padding-left: 2.75rem;
	}

	.filter-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--muted);
		pointer-events: none;
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 1.5rem 0 0.75rem;
	}

	.results-count {
		font-size: 0.9rem;
		color: var(--muted);
	}

	.loading {
		padding: 2rem 0;
	}

	@media (max-width: 640px) {
		.filter-form {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
