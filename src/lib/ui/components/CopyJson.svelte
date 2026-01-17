<script lang="ts">
	import { canonicalJson } from '$lib/ui/canonical_json';
	import CopyCode from './CopyCode.svelte';

	type Props = {
		label?: string;
		value: unknown;
	};

	let { label = 'Copy JSON', value }: Props = $props();

	let json = $derived(canonicalJson(value));
</script>

<CopyCode {label} code={json} />
