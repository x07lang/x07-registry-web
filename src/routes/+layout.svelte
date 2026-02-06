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
			<span class="nav__divider" aria-hidden="true"></span>
			<a href="https://x07lang.org/" target="_blank" rel="noopener noreferrer">x07lang.org</a>
			<a href="https://discord.gg/59xuEuPN47" target="_blank" rel="noopener noreferrer">Discord</a>
			<a href="mailto:support@x07lang.org">Email</a>
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
	<div class="container footer__inner">
		<span class="footer__brand muted">
			<span>x07.io</span>
			<span>·</span>
			<span>The X07 package registry</span>
		</span>
		<span class="footer__links">
			<a href="/docs">Documentation</a>
			<a href="https://x07lang.org/" target="_blank" rel="noopener noreferrer">x07lang.org</a>
			<a href="https://discord.gg/59xuEuPN47" target="_blank" rel="noopener noreferrer">Discord</a>
			<a href="mailto:support@x07lang.org">support@x07lang.org</a>
			<a href="https://github.com/x07lang/x07" target="_blank" rel="noopener noreferrer">GitHub</a>
		</span>
	</div>
</footer>

<style>
	.header {
		position: sticky;
		top: 0;
		backdrop-filter: blur(16px) saturate(1.5);
		-webkit-backdrop-filter: blur(16px) saturate(1.5);
		background: rgba(10, 14, 19, 0.8);
		border-bottom: 1px solid var(--border);
		z-index: 100;
	}

	.header__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding-top: 0.85rem;
		padding-bottom: 0.85rem;
	}

	.brand {
		color: var(--text);
		font-weight: 700;
		font-size: 1.1rem;
		letter-spacing: -0.01em;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		transition: opacity var(--transition-fast);
	}

	.brand:hover {
		text-decoration: none;
		opacity: 0.85;
	}

	.brand__mark {
		display: block;
		border-radius: 6px;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.nav a {
		color: var(--muted);
		font-size: 0.9rem;
		font-weight: 500;
		padding: 0.45rem 0.7rem;
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.nav a:hover {
		color: var(--text);
		background: var(--panel-hover);
		text-decoration: none;
	}

	.nav__divider {
		width: 1px;
		height: 1rem;
		background: var(--border);
		margin: 0 0.5rem;
	}

	.footer {
		border-top: 1px solid var(--border);
		margin-top: 4rem;
		padding: 2rem 0;
		background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.15));
	}

	.footer__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
		font-size: 0.9rem;
	}

	.footer__brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.footer__links {
		display: inline-flex;
		gap: 1.25rem;
	}

	.footer__links a {
		color: var(--muted);
		font-weight: 500;
		transition: color var(--transition-fast);
	}

	.footer__links a:hover {
		color: var(--text);
		text-decoration: none;
	}

	@media (max-width: 640px) {
		.header__inner {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.nav {
			width: 100%;
			justify-content: flex-start;
		}

		.nav__divider {
			display: none;
		}

		.footer__inner {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
