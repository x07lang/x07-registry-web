<script lang="ts">
	import { onMount } from 'svelte';

	import { fetchText } from '$lib/api/client';
	import { getIndexConfig } from '$lib/api/registry';
	import type { ApiError } from '$lib/api/types';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';

	let indexOk = $state<boolean | null>(null);
	let registryOk = $state<boolean | null>(null);
	let error = $state<ApiError | null>(null);

	onMount(async () => {
		error = null;
		try {
			const cfg = await getIndexConfig();
			indexOk = true;
			const healthzUrl = new URL('../healthz', cfg.api).toString();
			const body = await fetchText(healthzUrl, 5000);
			registryOk = body.trim() === 'ok';
		} catch (err) {
			error = errorToApiError(err);
			if (indexOk === null) indexOk = false;
			if (registryOk === null) registryOk = false;
		}
	});
</script>

<h1>Status</h1>

<div class="card" style="margin-top: 1rem;">
	{#if error}
		<ErrorBox {error} />
	{/if}

	<table>
		<tbody>
			<tr>
				<th>Index</th>
				<td>
					{#if indexOk === null}
						<span class="muted">checking…</span>
					{:else if indexOk}
						<span class="badge">ok</span>
					{:else}
						<span class="badge badge--yanked">down</span>
					{/if}
				</td>
			</tr>
			<tr>
				<th>Registry API</th>
				<td>
					{#if registryOk === null}
						<span class="muted">checking…</span>
					{:else if registryOk}
						<span class="badge">ok</span>
					{:else}
						<span class="badge badge--yanked">down</span>
					{/if}
				</td>
			</tr>
		</tbody>
	</table>
</div>
