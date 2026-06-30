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

	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();
	});

	const chess = new SvelteChess();
	let playerColor = $state<Color>('w');

	let choobHistory = $state<ChoobHistory>([])

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

	/**
	 * Add entry to history based on color. "white" creates a new move and
	 * "black" appends to the most recent white move.
	 * 
	 * Most calls to this function will reverse color, because they are after a chess.move().
	 * This is to get the SAN sometimes
	 */
	const addEntryToHistory = (turn: Color, entry: ChoobHistoryEntry) => {
		if (turn === 'w')
			choobHistory.push([entry, null])
		else {
			const currentMove = choobHistory[choobHistory.length - 1]
			currentMove[1] = entry
		}
	}

	let onMove = $derived(async () => {
		// board should only move on its own when it's not our turn
		if (chess.turn === playerColor) return;

		// study moves are the only viable option if authtoken is not set
		if (authToken?.token?.value === undefined) {
			console.warn('authToken has not been set, defaulting to always using study moves');
			let moves = await getStudyMove(studyId, chess.fen, authToken?.token?.value, studyIsPublic);
			if (moves?.length) {
				const move = moves[Math.floor(Math.random() * moves.length)].notation.notation
				chess.move(move);
				addEntryToHistory(chess.turn === "w" ? "b" : "w", {
					centipawns: null,
					san: move,
					source: 'study'
				})
			} else {
				throw new Error(
					'no API key provided but not study move found. cannot move! should end the game in this state later'
				);
			}
			return;
		}

		// otherwise, use the weights. fall through to the next case if any step returns none
		let engineMove = await getEngineEvaluation(chess.fen, authToken?.token?.value);
		switch (Chooser.chooseWeightedObject(weights).type as MoveType) {
			case 'study':
				console.log("Trying study move");
				let studyMoves = await getStudyMove(studyId, chess.fen, authToken?.token?.value, studyIsPublic);
				if (studyMoves?.length) {
					let studyMove = studyMoves[Math.floor(Math.random() * studyMoves.length)].notation.notation;
					console.log(`Using study move: ${JSON.stringify(studyMove)}`)
					chess.move(studyMove);
					
					addEntryToHistory(chess.turn === "w" ? "b" : "w", {
						centipawns: engineMove?.centipawns ?? null,
						san: studyMove,
						source: 'study'
					})

					break;
				}
			case 'common':
				console.log("Trying common move");
				let commonMove = await getCommonMove(authToken?.token?.value, { play: getUCIHistory(chess) });
				if (commonMove?.length) {
					console.log(`Using common move: ${JSON.stringify(commonMove)}`)
					chess.move(commonMove);
					
					addEntryToHistory(chess.turn === "w" ? "b" : "w", {
						centipawns: engineMove?.centipawns ?? null,
						san: commonMove,
						source: 'common'
					})

					break;
				}
			case 'engine':
				console.log("Trying engine move");
				if(engineMove) {
					console.log(`Using engine move: ${JSON.stringify(engineMove.move)}`)
					chess.move(engineMove.move)
					
					const history = chess.chess.history()
					addEntryToHistory(chess.turn === "w" ? "b" : "w", {
						centipawns: engineMove?.centipawns ?? null,
						san: history[history.length - 1],
						source: 'engine'
					})

				} else {
					throw new Error(
						'Unable to resolve move as study, common, nor engine, should end game in this state later'
					);
				}
				break;
		}
	});
</script>

<script module>
	export type MoveType = 'study' | 'common' | 'engine' | 'player';
	export type MoveWeight = {
		type: MoveType;
		weight: number;
	};
	export type ChoobHistoryEntry = {
		san: string
		source: MoveType
		centipawns: number | null
	}
	export type ChoobHistory = [ChoobHistoryEntry, ChoobHistoryEntry | null][]
</script>

<button onclick={() => login.login()}> bello </button>
<p><b>Access token:</b> {authToken?.token?.value || 'Not logged in'}</p>
<ChessBoard {chess} {onMove} {addEntryToHistory} />
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
<table>
	<thead>
		<tr>
			<td>Move</td>
			<td>Eval</td>
			<td>Source</td>
			<td>Move</td>
			<td>Eval</td>
			<td>Source</td>
		</tr>
	</thead>
	<tbody>
		{#each choobHistory as entry (entry)}
			<tr>
				<td>{entry[0].san}</td>
				<td>{entry[0].centipawns || '-'}</td>
				<td>{entry[0]?.source || '-'}</td>
				<td>{entry[1]?.san || '-'}</td>
				<td>{entry[1]?.centipawns || '-'}</td>
				<td>{entry[1]?.source || '-'}</td>
			</tr>
		{/each}
	</tbody>
</table>
