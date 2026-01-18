<script lang="ts">
	import { onMount } from 'svelte';

	import { fetchText } from '$lib/api/client';
	import { getIndexConfig } from '$lib/api/registry';
	import type { ApiError } from '$lib/api/types';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';

	let indexOk = $state<boolean | null>(null);
	let registryOk = $state<boolean | null>(null);
	let error = $state<ApiError | null>(null);

	onMount(async () => {
		error = null;
		try {
			const cfg = await getIndexConfig();
			indexOk = true;
			const healthzUrl = new URL('../healthz', cfg.api).toString();
			const body = await fetchText(healthzUrl, 5000);
			registryOk = body.trim() === 'ok';
		} catch (err) {
			error = errorToApiError(err);
			if (indexOk === null) indexOk = false;
			if (registryOk === null) registryOk = false;
		}
	});
</script>

<div class="page-header">
	<h1>System Status</h1>
	<p class="muted">Real-time health checks of X07 registry services</p>
</div>

{#if error}
	<div class="card" style="margin-bottom: 1.5rem;">
		<ErrorBox {error} />
	</div>
{/if}

<div class="status-grid">
	<div class="status-card card">
		<div class="status-card__header">
			<span class="status-card__name">Sparse Index</span>
			{#if indexOk === null}
				<span class="status-indicator status-indicator--checking"></span>
			{:else if indexOk}
				<span class="status-indicator status-indicator--ok"></span>
			{:else}
				<span class="status-indicator status-indicator--down"></span>
			{/if}
		</div>
		<div class="status-card__status">
			{#if indexOk === null}
				<span class="muted">Checking…</span>
			{:else if indexOk}
				<span class="badge badge--accent">Operational</span>
			{:else}
				<span class="badge badge--yanked">Down</span>
			{/if}
		</div>
		<p class="status-card__desc muted">Package index and metadata</p>
	</div>

	<div class="status-card card">
		<div class="status-card__header">
			<span class="status-card__name">Registry API</span>
			{#if registryOk === null}
				<span class="status-indicator status-indicator--checking"></span>
			{:else if registryOk}
				<span class="status-indicator status-indicator--ok"></span>
			{:else}
				<span class="status-indicator status-indicator--down"></span>
			{/if}
		</div>
		<div class="status-card__status">
			{#if registryOk === null}
				<span class="muted">Checking…</span>
			{:else if registryOk}
				<span class="badge badge--accent">Operational</span>
			{:else}
				<span class="badge badge--yanked">Down</span>
			{/if}
		</div>
		<p class="status-card__desc muted">Package publishing and search</p>
	</div>
</div>

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

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.status-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.status-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.status-card__name {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.status-indicator {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.status-indicator--checking {
		background: var(--muted);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.status-indicator--ok {
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent-glow);
	}

	.status-indicator--down {
		background: var(--danger);
		box-shadow: 0 0 8px rgba(248, 113, 113, 0.4);
	}

	.status-card__status {
		margin-top: auto;
	}

	.status-card__desc {
		font-size: 0.9rem;
		margin: 0;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}
</style>
