<script lang="ts">
	import type { HTMLDetailsAttributes } from 'svelte/elements';

	let { children, title, actuallyUseAccordion, ...rest }: HTMLDetailsAttributes & { actuallyUseAccordion: boolean } =
		$props();
</script>

{#if !actuallyUseAccordion}
	{#if children}
		{@render children()}
	{/if}
{:else}
	<details {...rest}>
		<summary class="flex w-full items-center">
			<p>{title}</p>
		</summary>
		<ul>
			{#if children}
				{@render children()}
			{/if}
		</ul>
	</details>
{/if}

<style>
	summary {
		height: 2em;
		margin-top: 0.5em;
        padding-left: 0.5em;
		background-color: var(--background-gray);
	}

	summary::before {
		height: 3em;
	}
</style>
