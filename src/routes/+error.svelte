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
</script>

<div class="card">
	<h1>Request failed ({status})</h1>
	<p class="muted">{message(error)}</p>
	<p><a href="/">Go home</a></p>
</div>
