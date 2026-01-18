<h1>Yanking</h1>

<div class="card" style="margin-top: 1rem;">
	<p class="muted">
		A yanked version is excluded from new dependency resolution, but remains downloadable for reproducibility.
	</p>
	<p class="muted">
		Owners can yank and un-yank versions from the x07.io package page (while signed in), or via
		<code class="code-inline">POST /v1/packages/&lt;name&gt;/&lt;version&gt;/yank</code> with JSON body
		<code class="code-inline">&#123;"yanked":true&#125;</code>.
	</p>
	<p class="muted">
		The sparse index always includes a <code class="code-inline">yanked</code> boolean flag for each version entry.
	</p>
</div>

<style>
	.code-inline {
		font-family: var(--mono);
	}
</style>
