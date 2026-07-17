<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import Checkbox from "./Checkbox.svelte";

    let { group = $bindable(), ...rest }: Omit<HTMLInputAttributes, 'type'> = $props()
</script>

<Checkbox type="radio" bind:checked={group} {...rest} class=""/>
