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
    border-1 border-slate-100 px-1
    [&:enabled]:hover:cursor-pointer [&:enabled]:hover:bg-slate-200 [&:enabled]:active:bg-slate-300
    [&:disabled]:bg-slate-200 [&:disabled]:text-slate-400
    "
>
	{@render children?.()}
</button>
