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
	<button class="copybutton__btn" type="button" onclick={copy} class:copied>
		{#if copied}
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="20 6 9 17 4 12"></polyline>
			</svg>
			Copied
		{:else}
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
			</svg>
			{label}
		{/if}
	</button>
	{#if error}<span class="copybutton__error">Copy failed: {error}</span>{/if}
</div>

<style>
	.copybutton {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
	}

	.copybutton__btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.85rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--muted);
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.copybutton__btn:hover {
		color: var(--text);
		background: var(--panel-hover);
		border-color: var(--border-strong);
	}

	.copybutton__btn.copied {
		color: var(--accent);
		border-color: rgba(45, 212, 168, 0.3);
		background: var(--accent-subtle);
	}

	.copybutton__error {
		font-size: 0.8rem;
		color: var(--danger);
	}
</style>

