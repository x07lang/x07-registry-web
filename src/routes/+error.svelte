<script lang="ts">
	type Props = {
		error: unknown;
		status: number;
	};

	let { error, status } = $props() as Props;

	function message(err: unknown): string {
		if (err instanceof Error) return err.message;
		return String(err);
	}

	const statusMessages: Record<number, string> = {
		400: 'Bad Request',
		401: 'Unauthorized',
		403: 'Forbidden',
		404: 'Page Not Found',
		500: 'Internal Server Error',
		502: 'Bad Gateway',
		503: 'Service Unavailable'
	};

	let statusText = $derived(statusMessages[status] ?? 'Error');
</script>

<div class="error-page">
	<div class="error-card card">
		<div class="error-icon">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
		</div>
		<div class="error-status">{status}</div>
		<h1>{statusText}</h1>
		<p class="error-message muted">{message(error)}</p>
		<a class="btn btn--primary" href="/">Return home</a>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
	}

	.error-card {
		max-width: 400px;
		text-align: center;
		padding: 2.5rem;
	}

	.error-icon {
		color: var(--muted);
		margin-bottom: 1rem;
	}

	.error-status {
		font-size: 4rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--text);
		line-height: 1;
		margin-bottom: 0.5rem;
	}

	.error-card h1 {
		font-size: 1.25rem;
		margin: 0 0 1rem;
		color: var(--text-secondary);
	}

	.error-message {
		margin-bottom: 1.5rem;
		font-size: 0.95rem;
	}
</style>
