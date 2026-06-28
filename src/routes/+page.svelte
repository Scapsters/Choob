<script lang="ts">
	import { Chess } from 'chess.js';
	import 'svelte5-chessground/style.css';
	import ChessBoard from '../components/ChessBoard.svelte';
	import { Login, authToken } from './login.svelte.ts'
	import { page } from '$app/state';
	import { onMount } from 'svelte';


	let login: Login;
	onMount(() => {
		login = new Login(page.url.href);
		login.init();
	});

	const chess = new Chess();
</script>


<button onclick={() => login.login()}>
bello
</button>
<p><b>Access token:</b> {authToken?.token ?? 'Not logged in'}</p>
<ChessBoard {chess} />
