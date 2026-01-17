<script lang="ts">
	type Props = {
		label?: string;
		code: string;
	};

	let { label = 'Copy', code }: Props = $props();

	let copied = $state(false);
	let error = $state<string | null>(null);

	async function copy() {
		error = null;
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1500);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	}
</script>

<div class="copycode">
	<div class="copycode__actions">
		<button class="btn" type="button" onclick={copy}>{copied ? 'Copied' : label}</button>
		{#if error}<span class="muted">copy failed: {error}</span>{/if}
	</div>
	<pre class="code"><code>{code}</code></pre>
</div>

<style>
	.copycode {
		display: grid;
		gap: 0.5rem;
	}

	.copycode__actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
</style>
