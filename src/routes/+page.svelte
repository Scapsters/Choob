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
	let studyId = $state('mzJ7q0W7');
	let studyIsPublic = $state(true);
	let weightCommonMove = $state(50);
	let weightStudyMove = $state(50);
	let weightEngineMove = $state(0);
</script>

<button onclick={() => login.login()}> bello </button>
<p><b>Access token:</b> {authToken?.token?.value || 'Not logged in'}</p>
<ChessBoard {chess} />
<p>
	Study ID: <input bind:value={studyId} placeholder="Input study Id..." />
	Study is public? <input type="checkbox" bind:checked={studyIsPublic} />
</p>

<p>
	Study move weight: 
	<input type="number" bind:value={weightStudyMove} min="0" max="100" />
	<input type="range" bind:value={weightStudyMove} min="0" max="100" />
</p>
<!-- TODO: force common/engine weight to 0 if authtoken is null, remove check in onMove -->
<p>
	Common move weight: 
	<input type="number" bind:value={weightCommonMove} min="0" max="100" />
	<input type="range" bind:value={weightCommonMove} min="0" max="100" />
</p>
<p>
	Engine move weight: 
	<input type="number" bind:value={weightEngineMove} min="0" max="100" />
	<input type="range" bind:value={weightEngineMove} min="0" max="100" />
</p>
<p>I am the mini board: {chess.fen}</p>
