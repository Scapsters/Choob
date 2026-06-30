<script lang="ts">
	import 'svelte5-chessground/style.css';
	import ChessBoard, { SvelteChess } from '../components/ChessBoard.svelte';
	import { Login, authToken } from '../lib/login.svelte.ts';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import type { Color } from 'chess.js';
	import { getStudyMove } from '../lib/chess/getStudyMove.ts';

	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();
	});

	const chess = new SvelteChess();
	
	let playerColor: Color = 'w'

	$effect(() => {
		if (chess.turn !== playerColor) {
			getStudyMove('mzJ7q0W7', chess.fen).then(moves => {
				chess.move(moves[Math.floor(Math.random() * moves.length)].notation.notation)
			})
		}
	})

</script>

<button onclick={() => login.login()}> bello </button>
<p><b>Access token:</b> {authToken?.token?.value || 'Not logged in'}</p>
<ChessBoard {chess} />
<p>I am the mini board: {chess.fen}</p>
