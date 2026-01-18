<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	import {
		getIndexConfig,
		getIndexEntries,
		getOwners,
		getPackageMetadata,
		latestNonYankedVersion,
		searchPackages
	} from '$lib/api/registry';
	import type { ApiError, IndexConfig, SearchResponse, SearchHit } from '$lib/api/types';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';
	import { isOfficialPackage } from '$lib/ui/official';

	type HitDetails = {
		name: string;
		hasOwners?: boolean;
		hasDescription?: boolean;
		latestNonYanked?: string | null;
		allYanked?: boolean;
	};

	function isNonEmptyString(value: unknown): value is string {
		return typeof value === 'string' && value.trim().length > 0;
	}

	async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
		const out: R[] = new Array(items.length);
		let nextIndex = 0;
		const n = Math.max(1, Math.min(concurrency, items.length));
		await Promise.all(
			Array.from({ length: n }, async () => {
				while (true) {
					const i = nextIndex++;
					if (i >= items.length) return;
					out[i] = await fn(items[i]);
				}
			})
		);
		return out;
	}

	let response = $state<SearchResponse | null>(null);
	let error = $state<ApiError | null>(null);
	let indexConfig = $state<IndexConfig | null>(null);

	let prefix = $state('');
	let hasDescription = $state(false);
	let hasOwners = $state(false);
	let yankedMode = $state<'any' | 'not_yanked' | 'yanked'>('any');

	let filterBusy = $state(false);
	let filterError = $state<ApiError | null>(null);
	let filtered = $state<SearchHit[]>([]);
	let details = $state<Map<string, HitDetails>>(new Map());

	let q = $derived((page.url.searchParams.get('q') ?? '').trim());

	let formQuery = $state('');

	$effect(() => {
		formQuery = q;
	});

	$effect(() => {
		const query = q;
		response = null;
		error = null;

		let cancelled = false;
		(async () => {
			try {
				const resp = await searchPackages(query, 100, 0);
				if (cancelled) return;
				response = resp;
			} catch (err) {
				if (cancelled) return;
				error = errorToApiError(err);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	onMount(async () => {
		try {
			indexConfig = await getIndexConfig();
		} catch {
			// Surface errors via the regular request path.
		}
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const query = formQuery.trim();
		void goto(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
	}

	$effect(() => {
		const resp = response;
		const baseHits = (resp?.packages ?? []) as SearchHit[];

		const prefixNeedle = prefix.trim().toLowerCase();
		const candidates = prefixNeedle
			? baseHits.filter((h) => h.name.startsWith(prefixNeedle))
			: baseHits;

		filtered = candidates;
		details = new Map();
		filterBusy = false;
		filterError = null;

		if (!resp) return;

		const needOwners = hasOwners;
		const needDescription = hasDescription;
		const needYanked = yankedMode !== 'any';
		if (!needOwners && !needDescription && !needYanked) return;

		let cancelled = false;
		filterBusy = true;
		(async () => {
			try {
				const detailRows = await pMap(candidates, 8, async (hit) => {
					const out: HitDetails = { name: hit.name };

					let latestNonYanked: string | null | undefined = undefined;
					if (needYanked || needDescription) {
						const entries = await getIndexEntries(hit.name);
						latestNonYanked = latestNonYankedVersion(entries);
						out.latestNonYanked = latestNonYanked;
						out.allYanked = latestNonYanked === null;
					}

					if (needOwners) {
						const owners = await getOwners(hit.name);
						out.hasOwners = owners.owners.length > 0;
					}

					if (needDescription) {
						const version = latestNonYanked ?? hit.latest_version;
						if (!version) {
							out.hasDescription = false;
						} else {
							const meta = await getPackageMetadata(hit.name, version);
							out.hasDescription = isNonEmptyString(meta.package.description);
						}
					}

					return out;
				});

				if (cancelled) return;

				const map = new Map<string, HitDetails>();
				for (const d of detailRows) map.set(d.name, d);
				details = map;

				filtered = candidates.filter((hit) => {
					const d = map.get(hit.name);
					if (needOwners && !(d?.hasOwners ?? false)) return false;
					if (needDescription && !(d?.hasDescription ?? false)) return false;
					if (yankedMode === 'not_yanked' && (d?.allYanked ?? false)) return false;
					if (yankedMode === 'yanked' && !(d?.allYanked ?? false)) return false;
					return true;
				});
			} catch (err) {
				if (cancelled) return;
				filterError = errorToApiError(err);
			} finally {
				if (!cancelled) filterBusy = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="page-header">
	<h1>Search Packages</h1>
	<p class="muted">Find packages with advanced filters</p>
</div>

{#if error}
	<div class="card">
		<ErrorBox title="Search unavailable" {error} />
	</div>
{:else if !response}
	<p class="muted loading">Loading search…</p>
{:else}
	<form onsubmit={submit} class="card search-form">
		<div class="form-row">
			<div class="form-field form-field--grow">
				<label for="q">Query</label>
				<input id="q" name="q" type="search" placeholder="Search packages…" bind:value={formQuery} />
			</div>
			<div class="form-field">
				<label for="prefix">Name prefix</label>
				<input id="prefix" name="prefix" type="text" placeholder="Optional" bind:value={prefix} />
			</div>
		</div>

		<div class="filters">
			<span class="filters__label muted">Filters:</span>
			<label class="filter">
				<input type="checkbox" checked={hasDescription} onchange={(e) => (hasDescription = (e.target as HTMLInputElement).checked)} />
				<span>Has description</span>
			</label>
			<label class="filter">
				<input type="checkbox" checked={hasOwners} onchange={(e) => (hasOwners = (e.target as HTMLInputElement).checked)} />
				<span>Has owners</span>
			</label>
			<label class="filter">
				<span>Yanked:</span>
				<select bind:value={yankedMode}>
					<option value="any">Any</option>
					<option value="not_yanked">Not yanked</option>
					<option value="yanked">Only yanked</option>
				</select>
			</label>
		</div>

		<div class="form-actions">
			<button class="btn btn--primary" type="submit">Search</button>
		</div>
	</form>

	{#if filterError}
		<div class="card" style="margin-top: 1.5rem;">
			<ErrorBox title="Filter data unavailable" error={filterError} />
		</div>
	{/if}

	<div class="results-header">
		<span class="results-count">
			{filtered.length} result{filtered.length === 1 ? '' : 's'}
			{#if filterBusy}
				<span class="muted">(applying filters…)</span>
			{/if}
		</span>
		<span class="muted">Total in index: {response.total}</span>
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
				{#each filtered as pkg}
					<tr>
						<td>
							<a href={`/packages/${pkg.name}`}>{pkg.name}</a>
							{#if isOfficialPackage(pkg.name, indexConfig?.verified_namespaces)}
								<span class="badge badge--accent">official</span>
							{/if}
						</td>
						<td class="muted">
							{#if details.get(pkg.name)?.latestNonYanked}
								v{details.get(pkg.name)?.latestNonYanked}
							{:else if pkg.latest_version}
								v{pkg.latest_version}
							{:else}
								—
							{/if}
						</td>
					</tr>
				{/each}
				{#if filtered.length === 0}
					<tr>
						<td colspan="2" class="muted" style="text-align: center; padding: 2rem;">No packages match your search</td>
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

	.search-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
	}

	.form-field--grow {
		flex: 1;
	}

	.form-field input[type='text'] {
		min-width: 180px;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.5rem;
		align-items: center;
		padding: 1rem;
		background: var(--panel);
		border-radius: var(--radius-sm);
	}

	.filters__label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.filter input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		accent-color: var(--accent);
	}

	.filter select {
		width: auto;
		min-width: 120px;
		font-size: 0.9rem;
		padding: 0.4rem 2rem 0.4rem 0.65rem;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 1.5rem 0 0.75rem;
		font-size: 0.9rem;
	}

	.results-count {
		color: var(--text-secondary);
	}

	.loading {
		padding: 2rem 0;
	}

	@media (max-width: 640px) {
		.form-row {
			grid-template-columns: 1fr;
		}

		.filters {
			flex-direction: column;
			align-items: flex-start;
		}

		.results-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
