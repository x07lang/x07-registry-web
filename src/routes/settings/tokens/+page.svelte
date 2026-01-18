<script lang="ts">
	import { onMount } from 'svelte';

	import { clearAuthToken, loadAuthToken, storeAuthToken } from '$lib/auth';
	import { createToken, getAccount, listTokens, revokeToken } from '$lib/api/registry';
	import type { AccountResponse, ApiError, TokenCreateResponse, TokenInfo } from '$lib/api/types';
	import CopyCode from '$lib/ui/components/CopyCode.svelte';
	import ErrorBox from '$lib/ui/components/ErrorBox.svelte';
	import { errorToApiError } from '$lib/ui/error';

	let tokenInput = $state('');
	let token = $state<string | null>(null);

	let account = $state<AccountResponse | null>(null);
	let tokens = $state<TokenInfo[] | null>(null);
	let error = $state<ApiError | null>(null);

	let createLabel = $state('');
	let createScopes = $state<string[]>([]);
	let createError = $state<ApiError | null>(null);
	let created = $state<TokenCreateResponse | null>(null);
	let busy = $state(false);

	onMount(() => {
		token = loadAuthToken();
		tokenInput = token ?? '';
	});

	$effect(() => {
		const t = token;
		account = null;
		tokens = null;
		error = null;
		createError = null;
		created = null;

		if (!t) return;

		let cancelled = false;
		(async () => {
			try {
				const [acct, list] = await Promise.all([getAccount(t), listTokens(t)]);
				if (cancelled) return;
				account = acct;
				tokens = list.tokens;
				createScopes = acct.scopes.includes('publish') ? ['publish'] : [];
			} catch (err) {
				if (cancelled) return;
				error = errorToApiError(err);
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function saveToken() {
		const next = tokenInput.trim();
		if (!next) {
			clearAuthToken();
			token = null;
			return;
		}
		storeAuthToken(next);
		token = next;
	}

	function signOut() {
		clearAuthToken();
		tokenInput = '';
		token = null;
	}

	let availableScopes = $derived.by(() => {
		return account?.scopes ?? [];
	});

	function toggleScope(scope: string) {
		if (!availableScopes.includes(scope)) return;
		if (createScopes.includes(scope)) createScopes = createScopes.filter((s) => s !== scope);
		else createScopes = [...createScopes, scope].sort();
	}

	async function submitCreate(e: SubmitEvent) {
		e.preventDefault();
		if (!token) return;

		busy = true;
		createError = null;
		created = null;
		try {
			const resp = await createToken(token, createLabel, createScopes);
			created = resp;
			const list = await listTokens(token);
			tokens = list.tokens;
		} catch (err) {
			createError = errorToApiError(err);
		} finally {
			busy = false;
		}
	}

	async function revoke(id: string) {
		if (!token) return;
		busy = true;
		createError = null;
		try {
			await revokeToken(token, id);
			const list = await listTokens(token);
			tokens = list.tokens;
		} catch (err) {
			createError = errorToApiError(err);
		} finally {
			busy = false;
		}
	}
</script>

<div class="page-header">
	<h1>Token Management</h1>
	<p class="muted">Manage your authentication tokens for the X07 registry</p>
</div>

<section class="card auth-card">
	<h2>Authentication</h2>
	<p class="text-secondary">Enter your auth token to manage tokens and view account details.</p>
	<div class="auth-form">
		<div class="auth-field">
			<label for="token">Auth token</label>
			<input id="token" name="token" type="password" placeholder="x07t_…" bind:value={tokenInput} />
		</div>
		<div class="auth-actions">
			<button class="btn btn--primary" type="button" onclick={saveToken}>Authenticate</button>
			{#if token}
				<button class="btn btn--ghost" type="button" onclick={signOut}>Sign out</button>
			{/if}
		</div>
	</div>
	{#if error}
		<div class="auth-error">
			<ErrorBox {error} />
		</div>
	{/if}
</section>

{#if token && account}
	<section class="card account-card">
		<h2>Account Details</h2>
		<div class="account-info">
			<div class="account-row">
				<span class="account-label">Handle</span>
				<code class="code-inline">{account.handle}</code>
			</div>
			<div class="account-row">
				<span class="account-label">Scopes</span>
				<div class="scope-badges">
					{#each account.scopes as scope}
						<span class="badge badge--accent">{scope}</span>
					{/each}
				</div>
			</div>
		</div>
	</section>
{/if}

{#if token}
	<section class="card create-card">
		<h2>Create New Token</h2>
		<form onsubmit={submitCreate} class="create-form">
			<div class="form-field">
				<label for="label">Label</label>
				<input id="label" name="label" type="text" placeholder="e.g., CI/CD pipeline" bind:value={createLabel} />
				<span class="form-hint muted">Optional identifier for this token</span>
			</div>

			<div class="form-field">
				<label>Scopes</label>
				<span class="form-hint muted">Must be a subset of your current token's scopes</span>
				<div class="scopes">
					{#each availableScopes as s}
						<label class="scope">
							<input
								type="checkbox"
								checked={createScopes.includes(s)}
								onchange={() => toggleScope(s)}
							/>
							<span>{s}</span>
						</label>
					{/each}
				</div>
			</div>

			<div class="form-actions">
				<button class="btn btn--primary" type="submit" disabled={busy}>
					{busy ? 'Creating…' : 'Create token'}
				</button>
			</div>
		</form>

		{#if createError}
			<div class="create-error">
				<ErrorBox title="Token action failed" error={createError} />
			</div>
		{/if}

		{#if created}
			<div class="created-token">
				<div class="created-warning">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
						<line x1="12" y1="9" x2="12" y2="13"></line>
						<line x1="12" y1="17" x2="12.01" y2="17"></line>
					</svg>
					<span>Copy this token now. You won't be able to see it again.</span>
				</div>
				<CopyCode label="Copy token" code={created.token} />
			</div>
		{/if}
	</section>
{/if}

{#if token && tokens}
	<section class="card tokens-card">
		<div class="tokens-header">
			<h2>Your Tokens</h2>
			<span class="muted">{tokens.length} token{tokens.length === 1 ? '' : 's'}</span>
		</div>
		<table>
			<thead>
				<tr>
					<th>Label</th>
					<th>Scopes</th>
					<th>Status</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each tokens as t}
					<tr>
						<td>{#if t.label}{t.label}{:else}<span class="muted">Unlabeled</span>{/if}</td>
						<td>
							<div class="scope-badges scope-badges--sm">
								{#each t.scopes as scope}
									<span class="badge">{scope}</span>
								{/each}
							</div>
						</td>
						<td>
							{#if t.revoked_at}
								<span class="badge badge--yanked">revoked</span>
							{:else}
								<span class="badge badge--accent">active</span>
							{/if}
						</td>
						<td class="action-cell">
							<button
								class="btn btn--ghost btn--sm"
								type="button"
								disabled={busy || !!t.revoked_at}
								onclick={() => revoke(t.id)}
							>
								Revoke
							</button>
						</td>
					</tr>
				{/each}
				{#if tokens.length === 0}
					<tr>
						<td colspan="4" class="muted empty-row">No tokens created yet</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</section>
{/if}

<style>
	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header h1 {
		margin-bottom: 0.25rem;
	}

	.page-header p {
		margin: 0;
	}

	.auth-card h2 {
		margin-bottom: 0.5rem;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1rem;
	}

	.auth-field {
		flex: 1;
	}

	.auth-actions {
		display: flex;
		gap: 0.75rem;
	}

	.auth-error {
		margin-top: 1rem;
	}

	.account-card {
		margin-top: 1.5rem;
	}

	.account-info {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.account-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.account-label {
		min-width: 80px;
		font-size: 0.9rem;
		color: var(--muted);
	}

	.scope-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.scope-badges--sm .badge {
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
	}

	.create-card {
		margin-top: 1.5rem;
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-top: 1rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-hint {
		font-size: 0.8rem;
	}

	.form-actions {
		padding-top: 0.5rem;
	}

	.scopes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}

	.scope {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.scope:hover {
		border-color: var(--border-strong);
		background: var(--panel-hover);
	}

	.scope input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		accent-color: var(--accent);
	}

	.create-error {
		margin-top: 1rem;
	}

	.created-token {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.created-warning {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.25);
		border-radius: var(--radius-sm);
		color: var(--warning);
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.tokens-card {
		margin-top: 1.5rem;
	}

	.tokens-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.tokens-header h2 {
		margin: 0;
	}

	.action-cell {
		text-align: right;
	}

	.empty-row {
		text-align: center;
		padding: 2rem 0.75rem;
	}
</style>
