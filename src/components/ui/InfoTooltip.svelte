<script lang="ts">
	let { title }: { title: string } = $props();
</script>

<span {title}>
    <div class="font-xs text-(--foreground-gray)/60 bg-(--disabled-color)/25 rounded-full h-5 w-5 text-center">
        <div class="curly font-bold -translate-y-1/8 select-none">i</div>
    </div>
</span>

<style>
    .curly {
        font-family: sans-serif
    }
</style>