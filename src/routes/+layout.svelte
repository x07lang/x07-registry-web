<script lang="ts">
	import { onMount } from 'svelte';

	import '../app.css';

	import type { ApiError } from '$lib/api/types';
	import { getRegistryWebConfig, RUNTIME_CONFIG_URL } from '$lib/config_runtime';
	import { errorToApiError } from '$lib/ui/error';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';

	let { children } = $props();

	let configLoaded = $state(false);
	let configError = $state<ApiError | null>(null);

	onMount(async () => {
		configLoaded = false;
		configError = null;
		try {
			await getRegistryWebConfig();
			configLoaded = true;
		} catch (err) {
			configError = errorToApiError(err);
		}
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/img/x07-logo-icon-dark.png" media="(prefers-color-scheme: dark)" />
	<link rel="icon" type="image/png" href="/img/x07-logo-icon-light.png" media="(prefers-color-scheme: light)" />
	<link rel="icon" type="image/png" href="/img/x07-logo-icon-dark.png" />
	<title>X07 Registry</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<header class="header">
	<div class="container header__inner">
		<a class="brand" href="/">
			<picture>
				<source srcset="/img/x07-logo-icon-dark.png" media="(prefers-color-scheme: dark)" />
				<source srcset="/img/x07-logo-icon-light.png" media="(prefers-color-scheme: light)" />
				<img class="brand__mark" src="/img/x07-logo-icon-dark.png" width="22" height="22" alt="" aria-hidden="true" />
			</picture>
			<span>x07.io</span>
		</a>
		<nav class="nav">
			<a href="/packages">Browse</a>
			<a href="/search">Search</a>
			<a href="/docs">Docs</a>
			<a href="/settings/tokens">Tokens</a>
			<a href="/status">Status</a>
			<a href="/api">API</a>
			<a href="https://x07lang.org/" target="_blank" rel="noopener noreferrer">x07lang.org</a>
			<a href="https://github.com/x07lang/x07" target="_blank" rel="noopener noreferrer">GitHub</a>
		</nav>
	</div>
</header>

<main class="container">
	{#if configError}
		<div class="card">
			<h1>Registry misconfigured</h1>
			<p class="muted">
				Failed to load runtime config from <code class="code-inline">{RUNTIME_CONFIG_URL}</code>.
			</p>
			<ErrorBox title="Runtime config error" error={configError} />
		</div>
	{:else if !configLoaded}
		<p class="muted">Loading config…</p>
	{:else}
		{@render children()}
	{/if}
</main>

<footer class="footer">
	<div class="container muted footer__inner">
		<span>x07.io — X07 package registry</span>
		<span class="footer__links">
			<a href="https://x07lang.org/" target="_blank" rel="noopener noreferrer">x07lang.org</a>
			<a href="https://github.com/x07lang/x07" target="_blank" rel="noopener noreferrer">GitHub</a>
		</span>
	</div>
</footer>

<style>
	.code-inline {
		font-family: var(--mono);
	}

	.header {
		position: sticky;
		top: 0;
		backdrop-filter: blur(12px);
		background: rgba(11, 15, 20, 0.72);
		border-bottom: 1px solid var(--border);
		z-index: 10;
	}

	.header__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.brand {
		color: var(--text);
		font-weight: 800;
		letter-spacing: 0.2px;
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.brand:hover {
		text-decoration: none;
	}

	.brand__mark {
		display: block;
	}

	.nav {
		display: flex;
		gap: 0.85rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.nav a {
		color: var(--muted);
		font-weight: 600;
		padding: 0.35rem 0.45rem;
		border-radius: 10px;
	}

	.nav a:hover {
		color: var(--text);
		background: rgba(255, 255, 255, 0.06);
		text-decoration: none;
	}

	.footer {
		border-top: 1px solid var(--border);
		margin-top: 3rem;
		padding: 1.5rem 0;
		background: rgba(0, 0, 0, 0.15);
	}

	.footer__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.footer__links {
		display: inline-flex;
		gap: 0.85rem;
	}

	.footer__links a {
		color: var(--muted);
		font-weight: 600;
	}

	.footer__links a:hover {
		color: var(--text);
		text-decoration: none;
	}
</style>
