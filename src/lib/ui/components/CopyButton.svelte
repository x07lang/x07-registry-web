<script lang="ts">
	import { copyToClipboard } from '$lib/ui/copy';

	type Props = {
		label?: string;
		text: string;
	};

	let { label = 'Copy', text }: Props = $props();

	let copied = $state(false);
	let error = $state<string | null>(null);

	async function copy() {
		error = null;
		try {
			await copyToClipboard(text);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1500);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	}
</script>

<div class="copybutton">
	<button class="btn" type="button" onclick={copy}>{copied ? 'Copied' : label}</button>
	{#if error}<span class="muted">copy failed: {error}</span>{/if}
</div>

<style>
	.copybutton {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
</style>

