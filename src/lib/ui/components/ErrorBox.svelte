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
	<h2>{title}</h2>
	<KeyValueTable {rows} />
</div>

<style>
	.errorbox {
		border-left: 3px solid rgba(255, 107, 107, 0.8);
		padding-left: 0.85rem;
	}

	.errorbox h2 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		color: var(--danger);
	}
</style>
