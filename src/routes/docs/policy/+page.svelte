<h1>Policy</h1>

<div class="card" style="margin-top: 1rem;">
	<h2>Source-only</h2>
	<p class="muted">Packages publish x07AST JSON sources. Builds remain deterministic and auditable.</p>

	<h2>Immutability</h2>
	<p class="muted">
		Published archives are content-addressed by sha256 in the sparse index. Re-publishing the same name+version is
		rejected.
	</p>

	<h2>Auth</h2>
	<p class="muted">
		Publishing requires a bearer token. Packages have owners, and tokens carry scopes (for example
		<code class="code-inline">publish</code>, <code class="code-inline">owner.manage</code>, <code class="code-inline">token.manage</code>).
	</p>
</div>

<style>
	.code-inline {
		font-family: var(--mono);
	}
</style>
