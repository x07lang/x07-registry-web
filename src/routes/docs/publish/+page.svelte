<script lang="ts">
	import { onMount } from 'svelte';

	import type { ApiError } from '$lib/api/types';
	import { getRegistryWebConfig } from '$lib/config_runtime';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';

	let indexBase = $state<string | null>(null);
	let error = $state<ApiError | null>(null);

	onMount(async () => {
		try {
			indexBase = (await getRegistryWebConfig()).index_base;
		} catch (err) {
			error = errorToApiError(err);
		}
	});

	let snippet = $derived.by(() => {
		const base = indexBase ?? '<index_base>';
		return `# Login (store token locally)\n\nx07 pkg login --index sparse+${base} --token <TOKEN>\n\n# Publish a package directory\n\nx07 pkg publish --index sparse+${base} --package <DIR>\n`;
	});
</script>

<h1>Publishing</h1>

<div class="card" style="margin-top: 1rem;">
	<p class="muted">
		Publishing is performed via the <code class="code-inline">x07</code> CLI, using a bearer token configured for the
		registry.
	</p>
	<p class="muted">
		For web-based token management, use <a href="/settings/tokens">/settings/tokens</a>.
	</p>
	{#if error}
		<ErrorBox {error} />
	{:else}
		<CopyCode label="Copy publish snippet" code={snippet} />
	{/if}
</div>

<style>
	.code-inline {
		font-family: var(--mono);
	}
</style>
