<script lang="ts">
	import { onMount } from 'svelte';

	import type { ApiError } from '$lib/api/types';
	import { getRegistryWebConfig } from '$lib/config_runtime';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';

	let indexBase = $state<string | null>(null);
	let error = $state<ApiError | null>(null);

	onMount(async () => {
		try {
			indexBase = (await getRegistryWebConfig()).index_base;
		} catch (err) {
			error = errorToApiError(err);
		}
	});

	let snippet = $derived.by(() => {
		const base = indexBase ?? '<index_base>';
		return `# Login (store token locally; prompts for token)\n\nx07 pkg login --index sparse+${base}\n\n# Login (non-interactive)\n\nprintf '%s' \"$X07_TOKEN\" | x07 pkg login --index sparse+${base} --token-stdin\n\n# Publish a package directory\n\nx07 pkg publish --index sparse+${base} --package <DIR>\n`;
	});
</script>

<h1>Publishing</h1>

<div class="card" style="margin-top: 1rem;">
	<p class="muted">
		Publishing is performed via the <code class="code-inline">x07</code> CLI, using a bearer token configured for the
		registry.
	</p>
	<p class="muted">
		To browse packages, go to <a href="/packages">/packages</a> (or https://x07.io/packages).
	</p>
	<h2>Getting a token</h2>
	<p class="muted">
		Sign in with GitHub on <a href="/settings/tokens">/settings/tokens</a>, then create a token with the
		<code class="code-inline">publish</code> scope. Don’t share tokens between people.
	</p>
	<p class="muted">
		Publishing requires a verified email on your GitHub account.
	</p>
	<p class="muted">
		Prefer a dedicated publish-only token for humans and CI.
	</p>
	<p class="muted">
		<code class="code-inline">x07 pkg login</code> stores credentials in
		<code class="code-inline">~/.x07/credentials.json</code> (or in
		<code class="code-inline">X07_PKG_HOME/credentials.json</code>).
	</p>
	<h2>Login + publish</h2>
	<p class="muted">
		Ensure your <code class="code-inline">x07-package.json</code> contains a <code class="code-inline">description</code>
		(and optionally <code class="code-inline">docs</code> for usage notes), bump the
		<code class="code-inline">version</code>, then publish the package directory.
	</p>
	<p class="muted">
		The first publish of a new package name creates the package and assigns you as the initial owner. To publish a new
		version of an existing package, your account must be listed as an owner.
	</p>
	{#if error}
		<ErrorBox {error} />
	{:else}
		<CopyCode label="Copy publish snippet" code={snippet} />
	{/if}
</div>

<style>
	.code-inline {
		font-family: var(--mono);
	}
</style>
