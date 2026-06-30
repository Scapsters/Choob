<script lang="ts">
	import 'svelte5-chessground/style.css';
	import ChessBoard, { SvelteChess } from '../components/ChessBoard.svelte';
	import { Login, authToken } from '../lib/login.svelte.ts';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import type { Color } from 'chess.js';
	import { getStudyMove } from '../lib/chess/getStudyMove.ts';
	import type { _ } from '$env/static/private';
	import Chooser from '../lib/external-packages/Chooser.js';
	import { getCommonMove } from '../lib/chess/getCommonMove.ts';
	import { getUCIHistory } from '../lib/chessjs-uci.ts';
	import { getEngineEvaluation } from '../lib/chess/getEngineEvaluation.ts';

	type MoveType = 'study' | 'common' | 'engine';
	type MoveWeight = {
		type: MoveType;
		weight: number;
	};

	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();
	});

	const chess = new SvelteChess();
	let playerColor: Color = 'w';

	let studyId = $state('mzJ7q0W7');
	let studyIsPublic = $state(true);
	let weightCommonMove = $state(50);
	let weightStudyMove = $state(50);
	let weightEngineMove = $state(0);
	let weights: MoveWeight[] = $derived([
		{
			type: 'study',
			weight: weightStudyMove
		},
		{
			type: 'common',
			weight: weightCommonMove
		},
		{
			type: 'engine',
			weight: weightEngineMove
		}
	]);

	let onMove = $derived(async () => {
		// board should only move on its own when it's not our turn
		if (chess.turn === playerColor) return;

		// study moves are the only viable option if authtoken is not set
		if (authToken?.token?.value === undefined) {
			console.warn('authToken has not been set, defaulting to always using study moves');
			let moves = await getStudyMove(studyId, chess.fen, authToken?.token?.value, studyIsPublic);
			if (moves?.length) {
				chess.move(moves[Math.floor(Math.random() * moves.length)].notation.notation);
			} else {
				throw new Error(
					'no API key provided but not study move found. cannot move! should end the game in this state later'
				);
			}
			return;
		}

		// otherwise, use the weights. fall through to the next case if any step returns none
		switch (Chooser.chooseWeightedObject(weights).type as MoveType) {
			case 'study':
				console.log("Trying study move");
				let studyMoves = await getStudyMove(studyId, chess.fen, authToken?.token?.value, studyIsPublic);
				if (studyMoves?.length) {
					let studyMove = studyMoves[Math.floor(Math.random() * studyMoves.length)].notation.notation;
					console.log(`Using study move: ${JSON.stringify(studyMove)}`)
					chess.move(studyMove);
					break;
				}
			case 'common':
				console.log("Trying common move");
				let commonMove = await getCommonMove(authToken?.token?.value, { play: getUCIHistory(chess) });
				if (commonMove?.length) {
					console.log(`Using common move: ${JSON.stringify(commonMove)}`)
					chess.move(commonMove);
					break;
				}
			case 'engine':
				console.log("Trying engine move");
				let engineMove = await getEngineEvaluation(chess.fen, authToken?.token?.value);
				if(engineMove) {
					console.log(`Using engine move: ${JSON.stringify(engineMove.move)}`)
					chess.move(engineMove.move)
				} else {
					throw new Error(
						'Unable to resolve move as study, common, nor engine, should end game in this state later'
					);
				}
				break;
		}
	});
</script>

<button onclick={() => login.login()}> bello </button>
<p><b>Access token:</b> {authToken?.token?.value || 'Not logged in'}</p>
<ChessBoard {chess} {onMove} />
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
