<script lang="ts">
	let { title }: { title: string } = $props();
</script>

<span {title}>

    <div class="italic font-xs text-(--disabled-color) -translate-y-1/4 bg-(--disabled-color)/25 rounded-full h-5 w-5 text-center">
        <div class="-translate-y-1/8 select-none">i</div>
    </div>
</span>
