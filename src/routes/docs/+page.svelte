<div class="page-header">
	<h1>Documentation</h1>
	<p class="muted">Learn how to use the X07 package registry</p>
</div>

<div class="docs-grid">
	<a href="/docs/publish" class="doc-card card card--glow">
		<div class="doc-card__icon">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="17 8 12 3 7 8"></polyline>
				<line x1="12" y1="3" x2="12" y2="15"></line>
			</svg>
		</div>
		<h2 class="doc-card__title">Publishing</h2>
		<p class="doc-card__desc muted">How to publish packages to the registry</p>
	</a>

	<a href="/docs/yanking" class="doc-card card card--glow">
		<div class="doc-card__icon">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
			</svg>
		</div>
		<h2 class="doc-card__title">Yanking</h2>
		<p class="doc-card__desc muted">How to yank (deprecate) package versions</p>
	</a>

	<a href="/docs/policy" class="doc-card card card--glow">
		<div class="doc-card__icon">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
				<polyline points="14 2 14 8 20 8"></polyline>
				<line x1="16" y1="13" x2="8" y2="13"></line>
				<line x1="16" y1="17" x2="8" y2="17"></line>
				<polyline points="10 9 9 9 8 9"></polyline>
			</svg>
		</div>
		<h2 class="doc-card__title">Policy</h2>
		<p class="doc-card__desc muted">Registry policies and guidelines</p>
	</a>

	<a
		href="https://x07lang.org/docs/getting-started/agent-quickstart/"
		target="_blank"
		rel="noopener noreferrer"
		class="doc-card card card--glow"
	>
		<div class="doc-card__icon">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 2l3 7h7l-5.5 4 2.5 7-7-4.5L5 20l2.5-7L2 9h7z"></path>
			</svg>
		</div>
		<h2 class="doc-card__title">Agent quickstart</h2>
		<p class="doc-card__desc muted">Follow the canonical agent-first toolchain flow</p>
	</a>
</div>

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

	.docs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1rem;
	}

	.doc-card {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
	}

	.doc-card:hover {
		text-decoration: none;
	}

	.doc-card__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-sm);
		background: var(--accent-subtle);
		color: var(--accent);
		margin-bottom: 1rem;
	}

	.doc-card__title {
		margin: 0 0 0.5rem;
		font-size: 1.15rem;
		color: var(--text);
	}

	.doc-card__desc {
		margin: 0;
		font-size: 0.9rem;
	}
</style>
