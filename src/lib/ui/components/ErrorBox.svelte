<script lang="ts">
	import type { ApiError } from '$lib/api/types';
	import KeyValueTable from './KeyValueTable.svelte';

	type Props = {
		title?: string;
		error: ApiError;
	};

	let { title = 'Request failed', error }: Props = $props();

	let rows = $derived.by(() => {
		const out = [
			{ key: 'Code', value: error.code },
			{ key: 'Message', value: error.message }
		];
		if (error.httpStatus !== undefined) out.push({ key: 'HTTP', value: String(error.httpStatus) });
		if (error.url) out.push({ key: 'URL', value: error.url });
		if (error.request_id) out.push({ key: 'Request ID', value: error.request_id });
		return out;
	});
</script>

<div class="errorbox">
	<div class="errorbox__header">
		<svg class="errorbox__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10"></circle>
			<line x1="12" y1="8" x2="12" y2="12"></line>
			<line x1="12" y1="16" x2="12.01" y2="16"></line>
		</svg>
		<h2>{title}</h2>
	</div>
	<div class="errorbox__body">
		<KeyValueTable {rows} />
	</div>
</div>

<style>
	.errorbox {
		background: var(--danger-subtle);
		border: 1px solid rgba(248, 113, 113, 0.25);
		border-radius: var(--radius-sm);
		padding: 1rem;
	}

	.errorbox__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.errorbox__icon {
		color: var(--danger);
		flex-shrink: 0;
	}

	.errorbox__header h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--danger);
	}

	.errorbox__body {
		padding-left: 1.625rem;
	}
</style>
