<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	import { ApiClientError } from '$lib/api/client';
	import { searchPackages } from '$lib/api/registry';
	import type { SearchResponse, SearchHit } from '$lib/api/types';

	let response = $state<SearchResponse | null>(null);
	let error = $state<string | null>(null);

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
				if (err instanceof ApiClientError) error = `${err.apiError.code}: ${err.apiError.message}`;
				else error = err instanceof Error ? err.message : String(err);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const query = formQuery.trim();
		void goto(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
	}

	let results = $derived.by(() => {
		return (response?.packages ?? []) as SearchHit[];
	});
</script>

<h1>Search</h1>

{#if error}
	<div class="card">
		<p class="muted">search unavailable: {error}</p>
	</div>
{:else if !response}
	<p class="muted">Loading…</p>
{:else}
	<form onsubmit={submit} class="card" style="margin-top: 1rem;">
		<label for="q">Query</label>
		<input id="q" name="q" type="search" placeholder="package name" bind:value={formQuery} />
		<div style="margin-top: 0.75rem; display: flex; gap: 0.75rem;">
			<button class="btn" type="submit">Search</button>
		</div>
	</form>

	<p class="muted">
		{results.length} result(s) — total: {response.total}
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
				{#each results as pkg}
					<tr>
						<td><a href={`/packages/${pkg.name}`}>{pkg.name}</a></td>
						<td class="muted">{pkg.latest_version ? `v${pkg.latest_version}` : ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
