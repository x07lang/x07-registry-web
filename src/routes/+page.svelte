<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import { getCatalog, getIndexConfig } from '$lib/api/registry';
	import type { ApiError, Catalog, IndexConfig } from '$lib/api/types';
	import { getRegistryWebConfig } from '$lib/config_runtime';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';
	import { isOfficialPackage } from '$lib/ui/official';

	let q = $state('');
	let indexBase = $state<string | null>(null);
	let indexConfig = $state<IndexConfig | null>(null);
	let catalog = $state<Catalog | null>(null);
	let catalogError = $state<ApiError | null>(null);
	let indexConfigError = $state<ApiError | null>(null);

	onMount(async () => {
		catalog = null;
		indexConfig = null;
		catalogError = null;
		indexConfigError = null;

		const cfg = await getRegistryWebConfig();
		indexBase = cfg.index_base;

		const [catalogResult, indexCfgResult] = await Promise.allSettled([
			getCatalog(),
			getIndexConfig()
		]);

		if (catalogResult.status === 'fulfilled') {
			catalog = catalogResult.value;
		} else {
			catalogError = errorToApiError(catalogResult.reason);
		}

		if (indexCfgResult.status === 'fulfilled') {
			indexConfig = indexCfgResult.value;
		} else {
			indexConfigError = errorToApiError(indexCfgResult.reason);
		}
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const query = q.trim();
		void goto(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
	}

	let quickStart = $derived.by(() => {
		const base = indexBase ?? '<index_base>';
		return `# Use the public sparse index\n\nx07 pkg lock --index sparse+${base}\n`;
	});

	let indexConfigCurl = $derived.by(() => {
		const base = indexBase ?? '<index_base>/';
		const normalized = base.endsWith('/') ? base : `${base}/`;
		return `curl -fsSL ${normalized}config.json`;
	});
</script>

<div class="hero">
	<section class="card hero__left">
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
	</section>

	<section class="card hero__right">
		<h2>Quick start</h2>
		<p class="muted">Index base: <code class="code-inline">{indexBase ?? '—'}</code></p>
		<CopyCode label="Copy CLI snippet" code={quickStart} />
	</section>
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
							<div>
								<a href={`/packages/${pkg.name}`}>{pkg.name}</a>
								{#if isOfficialPackage(pkg.name, indexConfig?.verified_namespaces)}
									<span class="badge" style="margin-left: 0.5rem;">official</span>
								{/if}
							</div>
							{#if pkg.latest}<span class="muted">v{pkg.latest}</span>{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{:else if catalogError}
			<p class="muted">Catalog unavailable.</p>
			<details class="details">
				<summary class="muted">Show error details</summary>
				<div class="details__body">
					<ErrorBox title="Catalog error" error={catalogError} />
				</div>
			</details>
		{:else}
			<p class="muted">Loading…</p>
		{/if}
	</section>

	<section class="card">
		<h2>Agent panel</h2>
		<p class="muted">These endpoints are deterministic and copy/paste friendly.</p>
		<CopyCode label="Copy request" code={indexConfigCurl} />
		{#if indexConfigError}
			<details class="details" style="margin-top: 0.75rem;">
				<summary class="muted">Index config unavailable</summary>
				<div class="details__body">
					<ErrorBox title="Index config error" error={indexConfigError} />
				</div>
			</details>
		{/if}
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

	.details {
		margin-top: 0.75rem;
	}

	.details summary {
		cursor: pointer;
	}

	.details__body {
		margin-top: 0.75rem;
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
