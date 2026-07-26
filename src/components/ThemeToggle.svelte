<script lang="ts">
	import Checkbox from './ui/inputs/Checkbox.svelte';

	let isDark = $state(false);

	function setIsDark(v: boolean) {
		isDark = v;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.theme = isDark ? 'dark' : 'light';
	}
</script>

<label class="flex items-center gap-3">Dark Mode<Checkbox bind:checked={() => isDark, setIsDark}></Checkbox></label>
