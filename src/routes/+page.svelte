<script module>
	import type { ChoobEvaluation } from '../lib/chess/getEngineEvaluation.ts';

	export type MoveType = 'study' | 'common' | 'engine (C)' | 'engine (L)' | 'player';
	export type MoveWeight = {
		type: MoveType;
		weight: number;
	};
	export type ChoobHistoryEntry = ChoobEvaluation & {
		san: string;
		moveSource: MoveType;
	};
	export type ChoobHistory = [ChoobHistoryEntry, ChoobHistoryEntry | null][];
</script>

<script lang="ts">
	import 'svelte5-chessground/style.css';
	import ChessBoard, { SvelteChess } from '../components/ChessBoard.svelte';
	import { Login, authToken } from '../lib/login.svelte.ts';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import type { Color } from 'chess.js';
	import { getStudyMove, getStudyGames } from '../lib/chess/getStudyMove.ts';
	import type { _ } from '$env/static/private';
	import Chooser from '../lib/external-packages/Chooser.js';
	import { getCommonMove } from '../lib/chess/getCommonMove.ts';
	import { getUCIHistory } from '../lib/chessjs-uci.ts';
	import { getEngineEvaluation as getCloudEvaluation } from '../lib/chess/getEngineEvaluation.ts';
	import {
		evaluateFEN as getLocalEvaluation,
		initializeStockfish
	} from '../lib/chess/stockfish/stockfish.ts';

	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();

		initializeStockfish();
	});

	const chess = new SvelteChess();
	let playerColor = $state<Color>('w');

	let choobHistory = $state<ChoobHistory>([]);

	type StudyState = 'valid' | 'invalid' | 'loading'
	let studyId = $state('');
	let studyIsPublic = $state(true);
	let studyValidity: StudyState = $state('invalid');
	function validateStudyId() {
		studyValidity = 'loading';
		getStudyGames(studyId, studyIsPublic, authToken?.token?.value).then((games) => {
			if(games?.length) {
				studyValidity = 'valid';
			} else {
				studyValidity = 'invalid';
			}
		});
	}

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
			type: 'engine (C)',
			weight: weightEngineMove
		}
	]);
	let localEvalDepth = $state(14);

	/**
	 * Add entry to history based on color. "white" creates a new move and
	 * "black" appends to the most recent white move.
	 *
	 * Most calls to this function will reverse color, because they are after a chess.move().
	 * This is to get the SAN sometimes
	 */
	const addEntryToHistory = (turn: Color, entry: ChoobHistoryEntry) => {
		if (turn === 'w') choobHistory.push([entry, null]);
		else {
			const currentMove = choobHistory[choobHistory.length - 1];
			currentMove[1] = entry;
		}
	};

	const getEvaluation = async (fen: string): Promise<ChoobEvaluation> => {
		if (authToken?.token?.value) {
			const cloudEval = await getCloudEvaluation(fen, authToken.token.value);
			if (cloudEval) return cloudEval;
		}
		return getLocalEvaluation(fen, localEvalDepth);
	};

	let onMove = $derived(async (evaluation?: ChoobEvaluation) => {
		// board should only move on its own when it's not our turn
		if (chess.turn === playerColor) return;

		// otherwise, use the weights. fall through to the next case if any step returns none
		evaluation ??= await getEvaluation(chess.fen);
		const makeAndRecordMove = (move: string | { from: string; to: string }, source: MoveType) => {
			chess.move(move);
			const history = chess.chess.history();
			addEntryToHistory(chess.turn === 'w' ? 'b' : 'w', {
				...evaluation,
				san: history[history.length - 1],
				moveSource: source
			});
		};
		switch (Chooser.chooseWeightedObject(weights).type as MoveType) {
			case 'study':
				console.log('Trying study move');
				let studyMoves = await getStudyMove(
					studyId,
					chess.fen,
					authToken?.token?.value,
					studyIsPublic
				);
				if (studyMoves?.length) {
					let studyMove =
						studyMoves[Math.floor(Math.random() * studyMoves.length)].notation.notation;
					console.log(`Using study move: ${JSON.stringify(studyMove)}`);
					makeAndRecordMove(studyMove, 'study');
					break;
				}
			case 'common':
				if (authToken?.token?.value !== undefined) {
					console.log('Trying common move');
					let commonMove = await getCommonMove(authToken?.token?.value, {
						play: getUCIHistory(chess)
					});
					if (commonMove?.length) {
						console.log(`Using common move: ${JSON.stringify(commonMove)}`);
						makeAndRecordMove(commonMove, 'common');
						break;
					}
				}
			case 'engine (C)':
				if (authToken?.token?.value !== undefined) {
					console.log('Trying cloud engine move');
					if (evaluation.evalSource === 'cloud') {
						console.log(`Using cloud engine move: ${JSON.stringify(evaluation.move)}`);
						makeAndRecordMove(evaluation.move, 'engine (C)');
						break;
					}
				}
			case 'engine (L)':
				console.log(`Using local engine move: ${JSON.stringify(evaluation.move)}`);
				makeAndRecordMove(evaluation.move, 'engine (L)');
		}
	});
</script>

<button onclick={() => login.login()}> bello </button>
<p><b>Access token:</b> {authToken?.token?.value || 'Not logged in'}</p>
<ChessBoard {chess} {onMove} {addEntryToHistory} {getEvaluation} />
<p>
	Study ID: <input bind:value={studyId} placeholder="Input study Id..." oninput={validateStudyId} />
	Study is public? <input type="checkbox" bind:checked={studyIsPublic} />
	<br>
	{studyValidity}
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
<p>
	Local engine depth:
	<input type="number" bind:value={localEvalDepth} min="0" max="25" />
	<input type="range" bind:value={localEvalDepth} min="0" max="25" />
</p>

<button
	onclick={() =>
		window.open(
			`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`,
			'_blank'
		)}
>
	Lichess Button
</button>

<table>
	<thead>
		<tr class="*:px-2">
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
				<td>{entry[0].centipawns}</td>
				<td>{entry[0].moveSource}</td>
				<td>{entry[1]?.san ?? '-'}</td>
				<td>{entry[1]?.centipawns ?? '-'}</td>
				<td>{entry[1]?.moveSource ?? '-'}</td>
			</tr>
		{/each}
	</tbody>
</table>
