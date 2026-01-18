<script lang="ts">
	import { goto } from '$app/navigation';

	import { getIndexConfig, searchPackages } from '$lib/api/registry';
	import type { ApiError, IndexConfig, SearchHit, SearchResponse } from '$lib/api/types';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';
	import { isOfficialPackage } from '$lib/ui/official';

	const PER_PAGE = 25;

	let q = $state('');
	let currentPage = $state(1);
	let searchResult = $state<SearchResponse | null>(null);
	let indexConfig = $state<IndexConfig | null>(null);
	let error = $state<ApiError | null>(null);
	let loading = $state(true);

	async function fetchPage(query: string, page: number) {
		loading = true;
		error = null;
		try {
			const offset = (page - 1) * PER_PAGE;
			const [result, cfg] = await Promise.all([
				searchPackages(query, PER_PAGE, offset),
				indexConfig ? Promise.resolve(indexConfig) : getIndexConfig()
			]);
			searchResult = result;
			indexConfig = cfg;
		} catch (err) {
			error = errorToApiError(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchPage(q.trim(), currentPage);
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const query = q.trim();
		void goto(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
	}

	let results = $derived<SearchHit[]>(searchResult?.packages ?? []);
	let total = $derived(searchResult?.total ?? 0);
	let totalPages = $derived(Math.ceil(total / PER_PAGE));

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			currentPage = page;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function handleFilterInput() {
		currentPage = 1;
	}

	let pageNumbers = $derived.by(() => {
		const pages: (number | 'ellipsis')[] = [];
		const totalPg = totalPages;
		const current = currentPage;

		if (totalPg <= 7) {
			for (let i = 1; i <= totalPg; i++) pages.push(i);
		} else {
			pages.push(1);
			if (current > 3) pages.push('ellipsis');
			for (let i = Math.max(2, current - 1); i <= Math.min(totalPg - 1, current + 1); i++) {
				pages.push(i);
			}
			if (current < totalPg - 2) pages.push('ellipsis');
			pages.push(totalPg);
		}
		return pages;
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
			<input id="q" name="q" type="search" placeholder="Filter by name…" bind:value={q} oninput={handleFilterInput} />
		</div>
		<button class="btn btn--ghost" type="submit">Advanced search →</button>
	</form>
</div>

{#if error}
	<div class="card" style="margin-top: 1.5rem;">
		<ErrorBox title="Catalog unavailable" {error} />
	</div>
{:else if loading && !searchResult}
	<p class="muted loading">Loading packages…</p>
{:else}
	<div class="results-header">
		<span class="results-count">{total} package{total === 1 ? '' : 's'}{q.trim() ? ` matching "${q.trim()}"` : ''}</span>
		{#if loading}
			<span class="muted">Loading…</span>
		{/if}
	</div>
	<div class="card packages-table-card">
		<table class="packages-table">
			<thead>
				<tr>
					<th>Package</th>
					<th>Description</th>
					<th class="col-version">Version</th>
					<th class="col-modules">Modules</th>
				</tr>
			</thead>
			<tbody>
				{#each results as pkg}
					<tr>
						<td class="col-name">
							<a href={`/packages/${pkg.name}`}>{pkg.name}</a>
							{#if isOfficialPackage(pkg.name, indexConfig?.verified_namespaces)}
								<span class="badge badge--accent">official</span>
							{/if}
						</td>
						<td class="col-desc muted">{pkg.description || '—'}</td>
						<td class="col-version">{pkg.latest_version ? `v${pkg.latest_version}` : '—'}</td>
						<td class="col-modules">{pkg.modules_count ?? '—'}</td>
					</tr>
				{/each}
				{#if results.length === 0}
					<tr>
						<td colspan="4" class="muted" style="text-align: center; padding: 2rem;">No packages match your filter</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	{#if totalPages > 1}
		<nav class="pagination">
			<button
				class="pagination-btn"
				disabled={currentPage === 1}
				onclick={() => goToPage(currentPage - 1)}
			>
				← Previous
			</button>
			<div class="pagination-pages">
				{#each pageNumbers as p}
					{#if p === 'ellipsis'}
						<span class="pagination-ellipsis">…</span>
					{:else}
						<button
							class="pagination-page"
							class:active={p === currentPage}
							onclick={() => goToPage(p)}
						>
							{p}
						</button>
					{/if}
				{/each}
			</div>
			<button
				class="pagination-btn"
				disabled={currentPage === totalPages}
				onclick={() => goToPage(currentPage + 1)}
			>
				Next →
			</button>
		</nav>
	{/if}
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

	.packages-table-card {
		overflow-x: auto;
	}

	.packages-table {
		min-width: 700px;
	}

	.packages-table .col-name {
		white-space: nowrap;
	}

	.packages-table .col-desc {
		max-width: 350px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.packages-table .col-version {
		white-space: nowrap;
		text-align: center;
		width: 100px;
	}

	.packages-table .col-modules {
		text-align: center;
		width: 80px;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.5rem;
		padding: 1rem 0;
	}

	.pagination-btn {
		padding: 0.5rem 1rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--text);
		font-size: 0.9rem;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.pagination-btn:hover:not(:disabled) {
		background: var(--panel-hover);
		border-color: var(--border-strong);
	}

	.pagination-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination-pages {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.pagination-page {
		min-width: 2.25rem;
		height: 2.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		color: var(--muted);
		font-size: 0.9rem;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.pagination-page:hover {
		background: var(--panel);
		color: var(--text);
	}

	.pagination-page.active {
		background: var(--accent);
		color: var(--bg);
		font-weight: 600;
	}

	.pagination-ellipsis {
		padding: 0 0.5rem;
		color: var(--muted);
	}

	@media (max-width: 640px) {
		.filter-form {
			flex-direction: column;
			align-items: stretch;
		}

		.pagination {
			flex-wrap: wrap;
		}
	}
</style>
