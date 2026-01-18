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

<h1>Search</h1>

{#if error}
	<div class="card">
		<ErrorBox title="Search unavailable" {error} />
	</div>
{:else if !response}
	<p class="muted">Loading…</p>
{:else}
	<form onsubmit={submit} class="card" style="margin-top: 1rem;">
		<label for="q">Query</label>
		<input id="q" name="q" type="search" placeholder="package name" bind:value={formQuery} />

		<div style="margin-top: 0.75rem;">
			<label for="prefix">Name prefix</label>
			<input id="prefix" name="prefix" type="text" placeholder="(optional)" bind:value={prefix} />
		</div>

		<div style="margin-top: 0.75rem;" class="filters">
			<label class="filter">
				<input type="checkbox" checked={hasDescription} onchange={(e) => (hasDescription = (e.target as HTMLInputElement).checked)} />
				<span>Has description</span>
			</label>
			<label class="filter">
				<input type="checkbox" checked={hasOwners} onchange={(e) => (hasOwners = (e.target as HTMLInputElement).checked)} />
				<span>Has owners</span>
			</label>
			<label class="filter">
				<span>Yanked</span>
				<select bind:value={yankedMode}>
					<option value="any">Any</option>
					<option value="not_yanked">Not yanked</option>
					<option value="yanked">Only yanked</option>
				</select>
			</label>
		</div>

		<div style="margin-top: 0.75rem; display: flex; gap: 0.75rem;">
			<button class="btn" type="submit">Search</button>
		</div>
	</form>

	{#if filterError}
		<div class="card" style="margin-top: 1rem;">
			<ErrorBox title="Filter data unavailable" error={filterError} />
		</div>
	{:else if filterBusy}
		<p class="muted">Applying filters…</p>
	{/if}

	<p class="muted">
		{filtered.length} result(s) — total: {response.total}
	</p>
	<div class="card">
		<table>
			<thead>
				<tr>
					<th>Package</th>
					<th>Latest</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as pkg}
					<tr>
						<td>
							<a href={`/packages/${pkg.name}`}>{pkg.name}</a>
							{#if isOfficialPackage(pkg.name, indexConfig?.verified_namespaces)}
								<span class="badge" style="margin-left: 0.5rem;">official</span>
							{/if}
						</td>
						<td class="muted">
							{#if details.get(pkg.name)?.latestNonYanked}
								v{details.get(pkg.name)?.latestNonYanked}
							{:else if pkg.latest_version}
								v{pkg.latest_version}
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.5rem;
		align-items: center;
	}

	.filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	select {
		font-size: 1rem;
		padding: 0.5rem 0.65rem;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: rgba(0, 0, 0, 0.25);
		color: var(--text);
	}
</style>
