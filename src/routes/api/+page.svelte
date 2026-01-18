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

<h1>API</h1>

<div class="card" style="margin-top: 1rem;">
	<p class="muted">
		This page serves a pinned copy of the registry OpenAPI contract at
		{#if openapiUrl}
			<a href={openapiUrl}>{openapiUrl}</a>.
		{:else}
			<code class="code-inline">/openapi/openapi.json</code>.
		{/if}
	</p>
</div>

{#if error}
	<div class="card" style="margin-top: 1rem;">
		<ErrorBox title="OpenAPI unavailable" {error} />
	</div>
{:else if !openapiText}
	<p class="muted">Loading…</p>
{:else}
	<section class="card" style="margin-top: 1rem;">
		<CopyCode label="Copy OpenAPI JSON" code={openapiText} />
	</section>
{/if}

<style>
	.code-inline {
		font-family: var(--mono);
	}
</style>
