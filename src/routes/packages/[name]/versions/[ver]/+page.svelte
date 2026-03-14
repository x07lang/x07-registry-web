<script lang="ts">
	import { page } from '$app/state';

	import { getRegistryWebConfig } from '$lib/config_runtime';
	import {
		getAuthSession,
		getDownloadUrl,
		getIndexEntries,
		listAdvisories,
		getPackageMetadata,
		createAdvisory,
		withdrawAdvisory,
		validatePackageName,
		yankVersion
	} from '$lib/api/registry';
	import type {
		ApiError,
		AuthSessionUser,
		IndexEntry,
		PackageMetadataResponse,
		PkgAdvisory,
		PkgAdvisoryKind,
		PkgAdvisorySeverity
	} from '$lib/api/types';
	import CopyButton from '$lib/ui/components/CopyButton.svelte';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import CopyJson from '$lib/ui/components/CopyJson.svelte';

	let name = $derived(page.params.name ?? '');
	let ver = $derived(page.params.ver ?? '');

	let entry = $state<IndexEntry | null>(null);
	let meta = $state<PackageMetadataResponse | null>(null);
	let downloadUrl = $state<string | null>(null);
	let indexBase = $state<string | null>(null);
	let user = $state<AuthSessionUser | null>(null);
	let csrfToken = $state<string | null>(null);
	let advisories = $state<PkgAdvisory[] | null>(null);

	let error = $state<ApiError | null>(null);
	let yankError = $state<ApiError | null>(null);
	let yankBusy = $state(false);
	let advisoryError = $state<ApiError | null>(null);
	let advisoryBusy = $state(false);
	let withdrawBusyId = $state<string | null>(null);

	let advisoryKind = $state<PkgAdvisoryKind>('broken');
	let advisorySeverity = $state<PkgAdvisorySeverity>('high');
	let advisorySummary = $state('');
	let advisoryUrl = $state('');
	let advisoryDetails = $state('');

	$effect(() => {
		const pkgName = name;
		const version = ver;

		entry = null;
		meta = null;
		downloadUrl = null;
		indexBase = null;
		user = null;
		csrfToken = null;
		advisories = null;
		error = null;
		yankError = null;
		advisoryError = null;

		let cancelled = false;
		(async () => {
			try {
				validatePackageName(pkgName);
				const [webCfg, session] = await Promise.all([getRegistryWebConfig(), getAuthSession()]);
				if (cancelled) return;
				indexBase = webCfg.index_base;
				if (session.authenticated && session.user && session.csrf_token) {
					user = session.user;
					csrfToken = session.csrf_token;
				}

				const entries = await getIndexEntries(pkgName);
				const found = entries.find((e) => e.version === version) ?? null;
				if (!found) throw new Error('version not found');
				entry = found;

				const [m, dl, adv] = await Promise.all([
					getPackageMetadata(pkgName, version),
					getDownloadUrl(pkgName, version),
					listAdvisories(pkgName, version)
				]);
				if (cancelled) return;
				meta = m;
				downloadUrl = dl;
				advisories = adv.advisories;
			} catch (err) {
				if (cancelled) return;
				error = errorToApiError(err);
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	let canManage = $derived.by(() => {
		return user?.scopes?.includes('owner.manage') ?? false;
	});

	let installSnippet = $derived.by(() => {
		if (!entry) return '';
		const base = indexBase ?? '<index_base>';
		return `x07 pkg add ${name}@${ver} --sync --index sparse+${base}\n`;
	});

	let verifySnippet = $derived.by(() => {
		if (!entry || !downloadUrl) return '';
		const filename = `${name}-${ver}.tar`;
		return `# Download and verify\n\ncurl -fsSL ${downloadUrl} -o ${filename}\nshasum -a 256 ${filename}\n# expected: ${entry.cksum}\n`;
	});

	function moduleArchivePath(moduleId: string, moduleRoot: string): string {
		const trimmed = moduleId.trim();
		const rel = trimmed ? trimmed.split('.').join('/') : trimmed;
		return `${moduleRoot.replace(/\/+$/, '')}/${rel}.x07.json`;
	}

	let modules = $derived.by(() => {
		const pkg = meta?.package;
		if (!pkg) return [] as { moduleId: string; archivePath: string }[];
		return pkg.modules
			.slice()
			.sort((a, b) => a.localeCompare(b))
			.map((moduleId) => ({ moduleId, archivePath: moduleArchivePath(moduleId, pkg.module_root) }));
	});

	async function toggleYank() {
		if (!csrfToken) {
			yankError = { code: 'X07WEB_AUTH', message: 'not signed in (go to /settings/tokens)' };
			return;
		}
		if (!entry) return;

		yankBusy = true;
		yankError = null;
		try {
			await yankVersion(name, ver, !entry.yanked, csrfToken);
			const entries = await getIndexEntries(name);
			entry = entries.find((e) => e.version === ver) ?? entry;
		} catch (err) {
			yankError = errorToApiError(err);
		} finally {
			yankBusy = false;
		}
	}

	async function refreshAdvisoriesAndEntry() {
		const [entries, adv] = await Promise.all([getIndexEntries(name), listAdvisories(name, ver)]);
		entry = entries.find((e) => e.version === ver) ?? entry;
		advisories = adv.advisories;
	}

	async function submitAdvisory(event: Event) {
		event.preventDefault();
		if (!csrfToken) {
			advisoryError = { code: 'X07WEB_AUTH', message: 'not signed in (go to /settings/tokens)' };
			return;
		}
		const summary = advisorySummary.trim();
		if (!summary) {
			advisoryError = { code: 'X07WEB_BAD_INPUT', message: 'summary must be non-empty' };
			return;
		}

		advisoryBusy = true;
		advisoryError = null;
		try {
			await createAdvisory(
				name,
				ver,
				{
					kind: advisoryKind,
					severity: advisorySeverity,
					summary,
					url: advisoryUrl.trim() || undefined,
					details: advisoryDetails.trim() || undefined
				},
				csrfToken
			);
			await refreshAdvisoriesAndEntry();
			advisorySummary = '';
			advisoryUrl = '';
			advisoryDetails = '';
		} catch (err) {
			advisoryError = errorToApiError(err);
		} finally {
			advisoryBusy = false;
		}
	}

	async function withdraw(id: string) {
		if (!csrfToken) {
			advisoryError = { code: 'X07WEB_AUTH', message: 'not signed in (go to /settings/tokens)' };
			return;
		}
		withdrawBusyId = id;
		advisoryError = null;
		try {
			await withdrawAdvisory(name, ver, id, csrfToken);
			await refreshAdvisoriesAndEntry();
		} catch (err) {
			advisoryError = errorToApiError(err);
		} finally {
			withdrawBusyId = null;
		}
	}
</script>

<div class="page-header">
	<div class="breadcrumb muted">
		<a href="/packages">Packages</a>
		<span>/</span>
		<a href="/packages/{name}">{name}</a>
		<span>/</span>
		<span>v{ver}</span>
	</div>
	<div class="page-header__top">
		<h1><span class="pkg-name">{name}</span><span class="pkg-ver">@{ver}</span></h1>
		{#if entry?.yanked}
			<span class="badge badge--yanked">yanked</span>
		{:else if entry}
			<span class="badge badge--accent">ok</span>
		{/if}
		{#if entry?.advisories && entry.advisories.length > 0}
			<span class="badge badge--warning">advised</span>
		{/if}
		{#if meta?.is_official}
			<span class="badge badge--accent">official</span>
		{/if}
	</div>
	{#if meta?.package.description}
		<p class="page-header__desc">{meta.package.description}</p>
	{/if}
	{#if meta?.package.docs}
		<pre class="page-header__docs">{meta.package.docs}</pre>
	{/if}
</div>

{#if error}
	<div class="card">
		<ErrorBox {error} />
	</div>
{:else if !entry || !meta}
	<p class="muted loading">Loading version details…</p>
{:else}
	<div class="grid">
		<section class="card">
			<h2>Release Details</h2>
			<div class="release-info">
				<div class="info-row">
					<span class="info-label">Checksum (SHA-256)</span>
					<div class="checksum">
						<code class="code-inline">{entry.cksum}</code>
						<CopyButton label="Copy" text={entry.cksum} />
					</div>
				</div>
			</div>

			{#if entry.yanked}
				<div class="yank-notice">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
					</svg>
					<span>This version is yanked. It remains available for reproducibility, but should not be used for new installs.</span>
				</div>
			{/if}

			{#if advisories && advisories.length > 0}
				<div class="advisories">
					<h3>Advisories</h3>
					<div class="advisories-list">
						{#each advisories as adv (adv.id)}
							<div class="advisory">
								<div class="advisory-top">
									<div class="advisory-badges">
										<span class="badge badge--warning">{adv.kind}</span>
										<span class="badge badge--warning">{adv.severity}</span>
										{#if adv.withdrawn_at_utc}
											<span class="badge badge--yanked">withdrawn</span>
										{/if}
									</div>
									{#if adv.url}
										<a class="advisory-link" href={adv.url} rel="nofollow">Link</a>
									{/if}
								</div>
								<p class="advisory-summary">{adv.summary}</p>
								{#if adv.details}
									<pre class="advisory-details">{adv.details}</pre>
								{/if}
								{#if canManage && !adv.withdrawn_at_utc}
									<button
										class="btn btn--ghost"
										type="button"
										disabled={advisoryBusy || withdrawBusyId === adv.id}
										onclick={() => withdraw(adv.id)}
									>
										{withdrawBusyId === adv.id ? 'Withdrawing…' : 'Withdraw'}
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="release-actions">
				{#if downloadUrl}
					<a class="btn btn--primary" href={downloadUrl} rel="nofollow">Download v{ver}</a>
				{/if}
				<a class="btn btn--ghost" href="/packages/{name}">View all versions</a>
			</div>

			{#if canManage}
				<div class="yank-section">
					<h3>Owner Actions</h3>
					{#if yankError}
						<div style="margin-bottom: 1rem;">
							<ErrorBox title="Yank failed" error={yankError} />
						</div>
					{/if}
					<button class="btn" class:btn--yanked={!entry.yanked} disabled={yankBusy} onclick={toggleYank}>
						{#if entry.yanked}Un-yank version{:else}Yank version{/if}
					</button>

					<h4 class="advisory-actions-title">Advisories</h4>
					{#if advisoryError}
						<div style="margin-bottom: 1rem;">
							<ErrorBox title="Advisory action failed" error={advisoryError} />
						</div>
					{/if}
					<form class="advisory-form" onsubmit={submitAdvisory}>
						<div class="advisory-form__row">
							<div class="advisory-form__field">
								<label for="advisory-kind">Kind</label>
								<select id="advisory-kind" bind:value={advisoryKind}>
									<option value="broken">broken</option>
									<option value="security">security</option>
									<option value="deprecated">deprecated</option>
								</select>
							</div>
							<div class="advisory-form__field">
								<label for="advisory-severity">Severity</label>
								<select id="advisory-severity" bind:value={advisorySeverity}>
									<option value="low">low</option>
									<option value="medium">medium</option>
									<option value="high">high</option>
									<option value="critical">critical</option>
								</select>
							</div>
						</div>
						<div class="advisory-form__field">
							<label for="advisory-summary">Summary</label>
							<input
								id="advisory-summary"
								type="text"
								placeholder="One-sentence summary"
								bind:value={advisorySummary}
							/>
						</div>
						<div class="advisory-form__field">
							<label for="advisory-url">URL (optional)</label>
							<input id="advisory-url" type="text" placeholder="https://…" bind:value={advisoryUrl} />
						</div>
						<div class="advisory-form__field">
							<label for="advisory-details">Details (optional)</label>
							<textarea id="advisory-details" rows="4" bind:value={advisoryDetails}></textarea>
						</div>
						<div class="advisory-form__actions">
							<button class="btn btn--primary" type="submit" disabled={advisoryBusy}>
								{advisoryBusy ? 'Creating…' : 'Create advisory'}
							</button>
						</div>
					</form>
				</div>
			{/if}
		</section>

		<section class="card">
			<h2>Quick Start</h2>
			<div class="snippets">
				{#if installSnippet}
					<CopyCode label="Copy install commands" code={installSnippet} />
				{/if}
				{#if verifySnippet}
					<CopyCode label="Copy verify snippet" code={verifySnippet} />
				{/if}
				<CopyJson label="Copy metadata JSON" value={meta} />
			</div>
		</section>
	</div>

	<section class="card modules-card">
		<div class="modules-header">
			<h2>Modules</h2>
			<span class="muted">{modules.length} module{modules.length === 1 ? '' : 's'}</span>
		</div>
		{#if modules.length === 0}
			<p class="muted">No modules exported</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Module ID</th>
						<th>Archive path</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each modules as m}
						<tr>
							<td><code class="code-inline">{m.moduleId}</code></td>
							<td class="muted"><code>{m.archivePath}</code></td>
							<td class="action-cell"><CopyButton label="Copy" text={m.moduleId} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<details class="card manifest-card">
		<summary class="manifest-summary">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="9 18 15 12 9 6"></polyline>
			</svg>
			Package Manifest
		</summary>
		<div class="manifest-body">
			<CopyJson label="Copy x07-package.json" value={meta.package} />
		</div>
	</details>
{/if}

<style>
	.page-header {
		margin-bottom: 1.5rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
	}

	.breadcrumb a {
		color: var(--muted);
	}

	.breadcrumb a:hover {
		color: var(--accent);
	}

	.page-header__top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.page-header__top h1 {
		margin: 0;
	}

	.pkg-name {
		font-family: var(--mono);
	}

	.pkg-ver {
		color: var(--muted);
		font-weight: 400;
	}

	.page-header__desc {
		margin: 0.5rem 0 0;
		color: var(--muted);
		font-size: 1.05rem;
	}

	.page-header__docs {
		margin: 0.75rem 0 0;
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--muted);
		font-size: 0.9rem;
		white-space: pre-wrap;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.release-info {
		margin-bottom: 1.25rem;
	}

	.info-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-label {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.checksum {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.checksum .code-inline {
		font-size: 0.8rem;
		word-break: break-all;
	}

	.yank-notice {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		background: var(--danger-subtle);
		border: 1px solid rgba(248, 113, 113, 0.25);
		border-radius: var(--radius-sm);
		color: var(--danger);
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.yank-notice svg {
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.release-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.yank-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.yank-section h3 {
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.advisories {
		margin-bottom: 1.25rem;
		padding: 0.95rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--panel);
	}

	.advisories h3 {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
	}

	.advisories-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.advisory {
		padding: 0.75rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
	}

	.advisory-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.advisory-badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.advisory-link {
		color: var(--accent);
		font-size: 0.85rem;
	}

	.advisory-summary {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.95rem;
	}

	.advisory-details {
		margin: 0.5rem 0 0;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--panel);
		color: var(--muted);
		font-size: 0.85rem;
		white-space: pre-wrap;
	}

	.advisory-actions-title {
		margin: 1.25rem 0 0.5rem;
		font-size: 0.9rem;
	}

	.advisory-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.advisory-form__row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.advisory-form__field label {
		margin-bottom: 0.35rem;
	}

	.advisory-form__actions {
		display: flex;
		justify-content: flex-end;
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		font-family: inherit;
		font-size: 0.95rem;
		padding: 0.7rem 1rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
		resize: vertical;
	}

	textarea:hover {
		border-color: var(--border-strong);
	}

	textarea:focus,
	textarea:focus-visible {
		outline: none;
		border-color: var(--accent-dim);
		box-shadow: 0 0 0 3px var(--accent-subtle);
	}

	.btn--yanked {
		border-color: rgba(248, 113, 113, 0.3);
		background: var(--danger-subtle);
		color: var(--danger);
	}

	.btn--yanked:hover {
		background: rgba(248, 113, 113, 0.2);
		border-color: rgba(248, 113, 113, 0.5);
		box-shadow: 0 0 16px rgba(248, 113, 113, 0.2);
	}

	.snippets {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.modules-card {
		margin-top: 1.5rem;
	}

	.modules-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.modules-header h2 {
		margin: 0;
	}

	.action-cell {
		text-align: right;
	}

	.manifest-card {
		margin-top: 1.5rem;
	}

	.manifest-summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: 600;
		color: var(--text-secondary);
		padding: 0.25rem 0;
	}

	.manifest-summary:hover {
		color: var(--text);
	}

	.manifest-summary svg {
		transition: transform var(--transition-fast);
	}

	details[open] .manifest-summary svg {
		transform: rotate(90deg);
	}

	.manifest-body {
		margin-top: 1rem;
	}

	.loading {
		padding: 2rem 0;
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.advisory-form__row {
			grid-template-columns: 1fr;
		}
	}
</style>
