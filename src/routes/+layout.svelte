<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>X07 Registry</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<header class="header">
	<div class="container header__inner">
		<a class="brand" href="/">x07.io</a>
		<nav class="nav">
			<a href="/packages">Browse</a>
			<a href="/search">Search</a>
			<a href="/docs">Docs</a>
			<a href="/settings/tokens">Tokens</a>
			<a href="/status">Status</a>
			<a href="/api">API</a>
		</nav>
	</div>
</header>

<main class="container">
	{@render children()}
</main>

<footer class="footer">
	<div class="container muted">x07.io — X07 package registry</div>
</footer>

<style>
	.header {
		position: sticky;
		top: 0;
		backdrop-filter: blur(12px);
		background: rgba(11, 16, 32, 0.72);
		border-bottom: 1px solid var(--border);
		z-index: 10;
	}

	.header__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.brand {
		color: var(--text);
		font-weight: 800;
		letter-spacing: 0.2px;
	}

	.nav {
		display: flex;
		gap: 0.85rem;
	}

	.nav a {
		color: var(--muted);
		font-weight: 600;
	}

	.nav a:hover {
		color: var(--text);
		text-decoration: none;
	}

	.footer {
		border-top: 1px solid var(--border);
		margin-top: 3rem;
		padding: 1.5rem 0;
		background: rgba(0, 0, 0, 0.15);
	}
</style>
