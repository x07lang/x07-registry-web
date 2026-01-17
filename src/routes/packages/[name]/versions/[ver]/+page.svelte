<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	import { ApiClientError } from '$lib/api/client';
	import { loadAuthToken } from '$lib/auth';
	import {
		getAccount,
		getDownloadUrl,
		getIndexEntries,
		getPackageMetadata,
		validatePackageName,
		yankVersion
	} from '$lib/api/registry';
	import type { AccountResponse, IndexEntry, PackageMetadataResponse } from '$lib/api/types';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import CopyJson from '$lib/ui/components/CopyJson.svelte';

	let name = $derived(page.params.name ?? '');
	let ver = $derived(page.params.ver ?? '');

	let entry = $state<IndexEntry | null>(null);
	let meta = $state<PackageMetadataResponse | null>(null);
	let downloadUrl = $state<string | null>(null);
	let account = $state<AccountResponse | null>(null);
	let token = $state<string | null>(null);

	let error = $state<string | null>(null);
	let yankError = $state<string | null>(null);
	let yankBusy = $state(false);

	onMount(() => {
		token = loadAuthToken();
	});

	$effect(() => {
		const pkgName = name;
		const version = ver;

		entry = null;
		meta = null;
		downloadUrl = null;
		account = null;
		error = null;
		yankError = null;

		let cancelled = false;
		(async () => {
			try {
				validatePackageName(pkgName);
				const entries = await getIndexEntries(pkgName);
				const found = entries.find((e) => e.version === version) ?? null;
				if (!found) throw new Error('version not found');
				entry = found;

				const [m, dl] = await Promise.all([getPackageMetadata(pkgName, version), getDownloadUrl(pkgName, version)]);
				if (cancelled) return;
				meta = m;
				downloadUrl = dl;

				if (token) {
					const acct = await getAccount(token);
					if (cancelled) return;
					account = acct;
				}
			} catch (err) {
				if (cancelled) return;
				if (err instanceof ApiClientError) error = `${err.apiError.code}: ${err.apiError.message}`;
				else error = err instanceof Error ? err.message : String(err);
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	let canYank = $derived.by(() => {
		return account?.scopes?.includes('owner.manage') ?? false;
	});

	let installSnippet = $derived.by(() => {
		if (!entry || !downloadUrl) return '';
		return `# Download and verify\\n\\ncurl -fsSL ${downloadUrl} -o ${name}-${ver}.tar\\n# Expected sha256: ${entry.cksum}\\n`;
	});

	async function toggleYank() {
		if (!token) {
			yankError = 'missing auth token (go to /settings/tokens)';
			return;
		}
		if (!entry) return;

		yankBusy = true;
		yankError = null;
		try {
			await yankVersion(token, name, ver, !entry.yanked);
			const entries = await getIndexEntries(name);
			entry = entries.find((e) => e.version === ver) ?? entry;
		} catch (err) {
			if (err instanceof ApiClientError) yankError = `${err.apiError.code}: ${err.apiError.message}`;
			else yankError = err instanceof Error ? err.message : String(err);
		} finally {
			yankBusy = false;
		}
	}
</script>

<h1>{name}@{ver}</h1>

{#if error}
	<div class="card" style="margin-top: 1rem;">
		<p class="muted">{error}</p>
	</div>
{:else if !entry || !meta}
	<p class="muted">Loading…</p>
{:else}
	<div class="grid">
		<section class="card">
			<h2>Release</h2>
			<p class="muted">
				Status:
				{#if entry.yanked}
					<span class="badge badge--yanked">yanked</span>
				{:else}
					<span class="badge">ok</span>
				{/if}
			</p>
			<p class="muted">
				Checksum: <code class="code-inline">{entry.cksum}</code>
			</p>
			{#if downloadUrl}
				<p>
					<a class="btn" href={downloadUrl} rel="nofollow">Download</a>
				</p>
			{/if}

			{#if canYank}
				<hr class="divider" />
				{#if yankError}
					<p class="muted">{yankError}</p>
				{/if}
				<button class="btn" disabled={yankBusy} onclick={toggleYank}>
					{#if entry.yanked}Un-yank{:else}Yank{/if}
				</button>
			{/if}
		</section>

		<section class="card">
			<h2>Agent panel</h2>
			{#if installSnippet}
				<CopyCode label="Copy download snippet" code={installSnippet} />
			{/if}
			<CopyJson label="Copy metadata JSON" value={meta} />
		</section>
	</div>

	<section class="card" style="margin-top: 1rem;">
		<h2>Manifest</h2>
		<CopyJson label="Copy x07-package.json" value={meta.package} />
	</section>
{/if}

<style>
	.code-inline {
		font-family: var(--mono);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border);
		margin: 1rem 0;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>

