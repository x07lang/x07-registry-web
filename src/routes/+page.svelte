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
	<section class="card card--glow hero__main">
		<div class="hero__header">
			<h1 class="hero__title">X07 Package Registry</h1>
			<p class="hero__subtitle">Discover, share, and fetch source-only X07 packages</p>
		</div>

		<form class="search" onsubmit={submit}>
			<div class="search__field">
				<svg class="search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8"></circle>
					<path d="m21 21-4.35-4.35"></path>
				</svg>
				<input id="q" name="q" type="search" placeholder="Search packages…" bind:value={q} />
			</div>
			<div class="search__actions">
				<button class="btn btn--primary" type="submit">Search</button>
				<a class="btn btn--ghost" href="/packages">Browse all</a>
				<a class="btn" href="/docs/publish">Publish</a>
			</div>
		</form>
	</section>

	<section class="card hero__aside">
		<h2>Quick start</h2>
		<p class="muted">Configure your project to use the public registry index.</p>
		<div class="hero__index">
			<span class="muted">Index:</span>
			<code class="code-inline">{indexBase ?? '—'}</code>
		</div>
		<CopyCode label="Copy CLI snippet" code={quickStart} />
		<p class="muted" style="margin-top: 0.5rem;">
			New to X07? Install with
			<a
				href="https://x07lang.org/docs/getting-started/installer/"
				target="_blank"
				rel="noopener noreferrer"
				>x07up</a
			>
			and start with the
			<a
				href="https://x07lang.org/docs/getting-started/agent-quickstart/"
				target="_blank"
				rel="noopener noreferrer"
				>Agent quickstart</a
			>.
		</p>
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
	.hero {
		display: grid;
		grid-template-columns: 1.4fr 1fr;
		gap: 1.5rem;
		align-items: stretch;
		margin-top: 2rem;
	}

	.hero__main {
		display: flex;
		flex-direction: column;
	}

	.hero__header {
		margin-bottom: 1.75rem;
	}

	.hero__title {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		margin: 0 0 0.5rem;
		background: linear-gradient(135deg, var(--text) 0%, var(--accent) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero__subtitle {
		font-size: 1.1rem;
		color: var(--muted);
		margin: 0;
	}

	.hero__aside {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.hero__aside h2 {
		margin-bottom: 0;
	}

	.hero__index {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.search {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: auto;
	}

	.search__field {
		position: relative;
	}

	.search__field input {
		padding-left: 2.75rem;
	}

	.search__icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--muted);
		pointer-events: none;
	}

	.search__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
	}

	.list li:last-child {
		border-bottom: none;
	}

	.list li:hover {
		background: var(--panel-hover);
		margin: 0 -0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		border-bottom-color: transparent;
	}

	.details {
		margin-top: 1rem;
	}

	.details summary {
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0.5rem 0;
	}

	.details summary:hover {
		color: var(--text);
	}

	.details__body {
		margin-top: 0.75rem;
	}

	@media (max-width: 860px) {
		.hero {
			grid-template-columns: 1fr;
			margin-top: 1.5rem;
		}

		.hero__title {
			font-size: 2rem;
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
