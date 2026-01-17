<script lang="ts">
	import { INDEX_BASE } from '$lib/config';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';

	const snippet = `# Login (store token locally)\\n\\nx07 pkg login --index sparse+${INDEX_BASE} --token <TOKEN>\\n\\n# Publish a package directory\\n\\nx07 pkg publish --index sparse+${INDEX_BASE} --package <DIR>\\n`;
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
	<CopyCode label="Copy publish snippet" code={snippet} />
</div>

<style>
	.code-inline {
		font-family: var(--mono);
	}
</style>
