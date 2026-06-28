<script lang="ts">
	import { Chess } from 'chess.js';
	import 'svelte5-chessground/style.css';
	import ChessBoard from '../components/ChessBoard.svelte';
	import { Login, authToken } from '../lib/login.svelte.ts';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';

	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();
	});

	const chess = new Chess();
</script>

<button onclick={() => login.login()}> bello </button>
<p><b>Access token:</b> {authToken?.token || 'Not logged in'}</p>
<ChessBoard {chess} />
