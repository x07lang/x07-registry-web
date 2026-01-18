<script lang="ts">
	import { onMount } from 'svelte';

	import { fetchText } from '$lib/api/client';
	import type { ApiError } from '$lib/api/types';
	import { getRegistryWebConfig } from '$lib/config_runtime';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';

	let openapiUrl = $state<string | null>(null);
	let openapiText = $state<string | null>(null);
	let error = $state<ApiError | null>(null);

	onMount(async () => {
		error = null;
		try {
			const cfg = await getRegistryWebConfig();
			openapiUrl = cfg.openapi_url;
			openapiText = await fetchText(cfg.openapi_url, 5000);
		} catch (err) {
			error = errorToApiError(err);
		}
	});
</script>

<div class="page-header">
	<h1>API Reference</h1>
	<p class="muted">OpenAPI specification for the X07 registry API</p>
</div>

<div class="card info-card">
	<div class="info-card__icon">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10"></circle>
			<line x1="12" y1="16" x2="12" y2="12"></line>
			<line x1="12" y1="8" x2="12.01" y2="8"></line>
		</svg>
	</div>
	<p>
		The registry API follows the OpenAPI 3.0 specification.
		{#if openapiUrl}
			View the spec at <a href={openapiUrl}>{openapiUrl}</a>
		{:else}
			Available at <code class="code-inline">/openapi/openapi.json</code>
		{/if}
	</p>
</div>

{#if error}
	<div class="card" style="margin-top: 1.5rem;">
		<ErrorBox title="OpenAPI unavailable" {error} />
	</div>
{:else if !openapiText}
	<p class="muted loading">Loading OpenAPI specification…</p>
{:else}
	<section class="card" style="margin-top: 1.5rem;">
		<h2>OpenAPI Specification</h2>
		<CopyCode label="Copy OpenAPI JSON" code={openapiText} />
	</section>
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

	.info-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.info-card__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-sm);
		background: var(--accent-subtle);
		color: var(--accent);
	}

	.info-card p {
		margin: 0;
		color: var(--text-secondary);
	}

	.loading {
		padding: 2rem 0;
	}
</style>
