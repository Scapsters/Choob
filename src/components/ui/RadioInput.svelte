<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Checkbox from './Checkbox.svelte';

    // svelte will give a warning when using group. Radio is also a controlled component, so we don't need
    // actual group tracking.
	let {
		selected = $bindable(),
		...rest
	}: Omit<HTMLInputAttributes, 'type' | 'group'> & { selected: HTMLInputAttributes['group'] } = $props();
</script>

<Checkbox type="radio" bind:checked={selected} {...rest} class="" />
