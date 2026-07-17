<script lang="ts">
	import { page } from '$app/state';
	import { auth, Login } from '$lib/login.svelte';
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import Button from './ui/Button.svelte';

	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();
	});

	$inspect(auth)
</script>

<div class="flex items-center gap-3">
	{#if auth.username}
	<p>Logged in as <b>{auth.username}</b></p>
	{:else}
	<Button onclick={() => login.login()}> Log in to Lichess </Button>
	{/if}
	<Button disabled={!auth.token} onclick={() => login.logout()}> Byebye </Button>
</div>
