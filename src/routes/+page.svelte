<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import { getCatalog } from '$lib/api/registry';
	import type { Catalog } from '$lib/api/types';
	import { INDEX_BASE } from '$lib/config';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';

	let q = $state('');
	let catalog = $state<Catalog | null>(null);
	let catalogError = $state<string | null>(null);

	onMount(async () => {
		try {
			catalog = await getCatalog();
		} catch (err) {
			catalogError = err instanceof Error ? err.message : String(err);
		}
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const query = q.trim();
		void goto(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
	}

	const quickStart = `# Use the public sparse index\\n\\nx07 pkg lock --index sparse+${INDEX_BASE}\\n`;
</script>

<div class="hero">
	<div class="hero__left">
		<h1>X07 package registry</h1>
		<p class="muted">Search and fetch source-only X07 packages.</p>

		<form class="search" onsubmit={submit}>
			<label for="q">Search</label>
			<input id="q" name="q" type="search" placeholder="package name" bind:value={q} />
			<div class="search__actions">
				<button class="btn" type="submit">Search</button>
				<a class="btn" href="/docs/publish">Publish</a>
			</div>
		</form>
	</div>

	<div class="hero__right card">
		<h2>Quick start</h2>
		<p class="muted">Index base: <code class="code-inline">{INDEX_BASE}</code></p>
		<CopyCode label="Copy CLI snippet" code={quickStart} />
	</div>
</div>

<div class="grid">
	<section class="card">
		<h2>Popular packages</h2>
		{#if catalog}
			{#if catalog.packages.length === 0}
				<p class="muted">No packages yet.</p>
			{:else}
						<ul class="list">
					{#each catalog.packages.slice(0, 12) as pkg}
						<li>
							<a href={`/packages/${pkg.name}`}>{pkg.name}</a>
							{#if pkg.latest}<span class="muted">v{pkg.latest}</span>{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{:else if catalogError}
			<p class="muted">catalog unavailable: {catalogError}</p>
		{:else}
			<p class="muted">Loading…</p>
		{/if}
	</section>

	<section class="card">
		<h2>Agent panel</h2>
		<p class="muted">These endpoints are deterministic and copy/paste friendly.</p>
		<CopyCode label="Copy request" code={`curl -fsSL ${INDEX_BASE}config.json`} />
	</section>
</div>

<style>
	.code-inline {
		font-family: var(--mono);
	}

	.hero {
		display: grid;
		grid-template-columns: 1.25fr 1fr;
		gap: 1rem;
		align-items: start;
		margin-top: 1.25rem;
	}

	.hero h1 {
		margin: 0;
		font-size: 2.2rem;
	}

	.search {
		margin-top: 1.25rem;
		display: grid;
		gap: 0.6rem;
	}

	.search__actions {
		display: flex;
		gap: 0.65rem;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1.25rem;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 0.75rem 0 0 0;
		display: grid;
		gap: 0.4rem;
	}

	.list li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
	}

	@media (max-width: 860px) {
		.hero {
			grid-template-columns: 1fr;
		}
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
