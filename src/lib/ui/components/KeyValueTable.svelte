<script lang="ts">
	type Row = {
		key: string;
		value: string;
	};

	type Props = {
		rows: Row[];
	};

	let { rows }: Props = $props();
</script>

<dl class="kv">
	{#each rows as row}
		<div class="kv__row">
			<dt class="kv__key">{row.key}</dt>
			<dd class="kv__value"><code>{row.value}</code></dd>
		</div>
	{/each}
</dl>

<style>
	.kv {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.kv__row {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}

	.kv__key {
		min-width: 6rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--muted);
		flex-shrink: 0;
	}

	.kv__value {
		margin: 0;
	}

	.kv__value code {
		font-family: var(--mono);
		font-size: 0.85rem;
		color: var(--text-secondary);
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>

