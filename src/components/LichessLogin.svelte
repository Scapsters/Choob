<script lang="ts">
	import { page } from "$app/state";
	import { authToken, Login } from "$lib/login.svelte";
	import { onMount } from "svelte";
	import { SvelteURL } from "svelte/reactivity";

    	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();
	});

</script>

<button onclick={() => login.login()}> bello </button>
<button onclick={() => login.logout()}> buhbye </button>
<p><b>Access token:</b> {authToken?.token?.value || 'Not logged in'}</p>
