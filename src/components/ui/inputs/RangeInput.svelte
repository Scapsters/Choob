<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { value = $bindable(), ...rest }: Omit<HTMLInputAttributes, 'type'> = $props();
</script>

<input type="range" bind:value {...rest} />

<style lang="postcss">
	input::-webkit-slider-thumb,
	input::-moz-range-thumb {
        height: 1em;
        width: round(.5em, 2px);
        border: 2px solid var(--background);
        background-color: var(--accent-color);
        border-radius: 0px;
        display: grid;
        place-content: center;
    }

	input::-webkit-slider-runnable-track,
    input::-moz-range-track {
		height: var(--line-thickness);
		background: var(--foreground);
	}

    input:disabled::-webkit-slider-thumb,
	input:disabled::-moz-range-thumb {
        background-color: var(--disabled-color);
    }

	input:disabled::-webkit-slider-runnable-track,
    input:disabled::-moz-range-track {
		background: var(--disabled-color);
	}
</style>
