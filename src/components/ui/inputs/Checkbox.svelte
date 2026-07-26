<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { checked = $bindable(), ...rest }: HTMLInputAttributes = $props();
</script>

{#if rest.type === 'checkbox' || !rest.type}
	<input type="checkbox" bind:checked {...rest} />
{:else if rest.type === 'radio'}
	<input type="radio" bind:group={checked} {...rest} />
{/if}

<style lang="postcss">
	@reference "tailwindcss";

	/* https://moderncss.dev/pure-css-custom-checkbox-style/ */
	input {
		/* Add if not using autoprefixer */
		-webkit-appearance: none;
		appearance: none;
		/* Not removed via appearance */
		margin: 0;

		font: inherit;
		width: round(1em, 2px);
		height: round(1em, 2px);
		background-color: var(--background);
		border: var(--line-thickness) solid var(--foreground-gray);

		/* place pseudoelement */
		display: grid;
		grid-template: 100% / 100%;
		place-items: center;
	}
	input:disabled {
		border: var(--line-thickness) solid var(--disabled-color);
	}

	/* normal states */
	input::before {
		content: '';
		grid-area: 1 / 1;
		width: round(0.5em, 2px);
		height: round(0.5em, 2px);

		background-color: transparent;
	}
	input:checked::before {
		background-color: var(--accent-color);
	}

	/* hover states */
	input:not(:checked):hover::before {
		background-color: color-mix(in lab, var(--foreground-gray) 25%, var(--background) 75%);
	}
	input[type='checkbox']:checked:hover::before {
		/* this implies deselection, and radio buttons cant deselect, so restrict to checkboxes */
		background-color: color-mix(in lab, var(--accent-color) 70%, var(--background) 30%);
	}

	/* disabled */
	input:disabled::before {
		clip-path: inset(25% 0 25% 0) !important;
		background-color: var(--disabled-color) !important;
	}
</style>
