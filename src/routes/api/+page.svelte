<script lang="ts">
	import { onMount } from 'svelte';

	import { fetchText } from '$lib/api/client';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';

	let openapiText = $state<string | null>(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		error = null;
		try {
			openapiText = await fetchText('/openapi/openapi.json', 5000);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	});
</script>

<h1>API</h1>

<div class="card" style="margin-top: 1rem;">
	<p class="muted">
		This page serves a pinned copy of the registry OpenAPI contract at
		<a href="/openapi/openapi.json">/openapi/openapi.json</a>.
	</p>
</div>

{#if error}
	<p class="muted">openapi unavailable: {error}</p>
{:else if !openapiText}
	<p class="muted">Loading…</p>
{:else}
	<section class="card" style="margin-top: 1rem;">
		<CopyCode label="Copy OpenAPI JSON" code={openapiText} />
	</section>
{/if}

