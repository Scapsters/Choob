<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';

	let { value = $bindable(), ...rest }: Omit<HTMLInputAttributes, 'type'> = $props();
</script>

<input
	type="text"
	bind:value
	{...rest}
	class={twMerge(
		`w-24 max-h-6 bg-[var(--background-gray)] px-1 
        [&:disabled]:bg-(--disabled-color)/25 [&:disabled]:text-(--disabled-color)/75`,
		rest.class as string
	)}
/>
