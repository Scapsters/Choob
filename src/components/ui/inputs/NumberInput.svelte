<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';

	let { value = $bindable(), spinner, ...rest }: Omit<HTMLInputAttributes, 'type'> & { spinner?: boolean } = $props();
</script>

<input
	type="number"
	bind:value
	{...rest}
	class:no-spinner={!spinner}
	class={twMerge(
		`max-w-8.75 max-h-6 bg-[var(--background-gray)] px-1
		[&:disabled]:bg-(--disabled-color)/25 [&:disabled]:text-(--disabled-color)/75`,
		rest.class as string
	)}
/>

<style>
	input.no-spinner {
		appearance: textfield;
	}
	input.no-spinner::-webkit-inner-spin-button,
	input.no-spinner::-webkit-outer-spin-button {
		appearance: none;
	}
</style>
