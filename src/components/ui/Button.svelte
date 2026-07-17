<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let {
		children,
		...rest
	}: HTMLButtonAttributes & {
		children?: Snippet;
	} = $props();
</script>

<button
	{...rest}
	class="
	px-2
    bg-(--background) border-(length:--line-thickness) border-(--foreground-gray)
    [&:enabled]:hover:cursor-pointer [&:enabled]:hover:bg-(--background-gray)/50 [&:enabled]:active:bg-(--background-gray)
    [&:disabled]:border-(--disabled-color) [&:disabled]:bg-(--disabled-color)/25 [&:disabled]:text-(--disabled-color)/75
    "
>
	{@render children?.()}
</button>
