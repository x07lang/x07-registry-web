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
	<pre class="copycode__pre"><code>{code}</code></pre>
	<div class="copycode__actions">
		<button class="copycode__btn" type="button" onclick={copy} class:copied>
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
		{#if error}<span class="copycode__error">Copy failed: {error}</span>{/if}
	</div>
</div>

<style>
	.copycode {
		position: relative;
	}

	.copycode__pre {
		font-family: var(--mono);
		font-size: 0.85rem;
		line-height: 1.55;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.9rem 1rem;
		padding-right: 5.5rem;
		margin: 0;
		overflow-x: auto;
		color: var(--text-secondary);
	}

	.copycode__pre code {
		font-family: inherit;
	}

	.copycode__actions {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.copycode__btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.6rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--muted);
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.copycode__btn:hover {
		color: var(--text);
		background: var(--panel-hover);
		border-color: var(--border-strong);
	}

	.copycode__btn.copied {
		color: var(--accent);
		border-color: rgba(45, 212, 168, 0.3);
		background: var(--accent-subtle);
	}

	.copycode__error {
		font-size: 0.75rem;
		color: var(--danger);
	}
</style>
