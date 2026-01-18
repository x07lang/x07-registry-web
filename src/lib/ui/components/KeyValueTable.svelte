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

<table>
	<tbody>
		{#each rows as row}
			<tr>
				<th class="key">{row.key}</th>
				<td><code class="value">{row.value}</code></td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.key {
		width: 11rem;
		color: var(--muted);
		font-weight: 700;
	}

	.value {
		font-family: var(--mono);
		font-size: 0.9rem;
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>

