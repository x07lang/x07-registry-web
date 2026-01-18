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

<h1>Tokens</h1>

<section class="card" style="margin-top: 1rem;">
	<label for="token">Auth token</label>
	<input id="token" name="token" type="password" placeholder="x07t_…" bind:value={tokenInput} />
	<div style="margin-top: 0.75rem; display: flex; gap: 0.75rem;">
		<button class="btn" type="button" onclick={saveToken}>Save</button>
		<button class="btn" type="button" onclick={signOut}>Clear</button>
	</div>
	{#if error}
		<div style="margin-top: 0.75rem;">
			<ErrorBox {error} />
		</div>
	{/if}
</section>

{#if token && account}
	<section class="card" style="margin-top: 1rem;">
		<h2>Account</h2>
		<p class="muted">
			Handle: <code class="code-inline">{account.handle}</code>
		</p>
		<p class="muted">
			Scopes: <code class="code-inline">{account.scopes.join(', ')}</code>
		</p>
	</section>
{/if}

{#if token}
	<section class="card" style="margin-top: 1rem;">
		<h2>Create token</h2>
		<form onsubmit={submitCreate}>
			<label for="label">Label</label>
			<input id="label" name="label" type="text" placeholder="(optional)" bind:value={createLabel} />

			<div style="margin-top: 0.75rem;">
				<div class="muted">Scopes (must be subset of current token)</div>
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

			<div style="margin-top: 0.75rem;">
				<button class="btn" type="submit" disabled={busy}>Create</button>
			</div>
		</form>

		{#if createError}
			<div style="margin-top: 0.75rem;">
				<ErrorBox title="Token action failed" error={createError} />
			</div>
		{/if}

		{#if created}
			<div style="margin-top: 1rem;">
				<CopyCode label="Copy token" code={created.token} />
			</div>
		{/if}
	</section>
{/if}

{#if token && tokens}
	<section class="card" style="margin-top: 1rem;">
		<h2>Existing tokens</h2>
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
						<td class="muted">{t.label}</td>
						<td class="muted">{t.scopes.join(', ')}</td>
						<td>
							{#if t.revoked_at}
								<span class="badge badge--yanked">revoked</span>
							{:else}
								<span class="badge">active</span>
							{/if}
						</td>
						<td style="text-align: right;">
							<button class="btn" type="button" disabled={busy || !!t.revoked_at} onclick={() => revoke(t.id)}>
								Revoke
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

<style>
	.code-inline {
		font-family: var(--mono);
	}

	.scopes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.scope {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	@media (max-width: 860px) {
		.scopes {
			grid-template-columns: 1fr;
		}
	}
</style>
