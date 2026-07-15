<script module>
	import type { ChoobEvaluation } from '../lib/chess/getCloudEvaluation.ts';

	
	export type ChoobHistoryEntry = Partial<ChoobEvaluation> & {
		san: string;
		moveSource: MoveType;
		winPercents?: ChoobCommonMove['winPercents'];
	};
	export type ChoobHistory = [ChoobHistoryEntry, ChoobHistoryEntry | null][];

	export const ssr = false;
	export const prerender = false;
</script>

<script lang="ts">
	import 'svelte5-chessground/style.css';
	import ChessBoard, { SvelteChess, type onMoveHandler } from '../components/ChessBoard.svelte';
	import { Login, authToken } from '../lib/login.svelte.ts';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import type { Color } from 'chess.js';
	import { DEFAULT_FEN } from '../lib/chess/getStudyMove.ts';
	import { getCommonMove, type ChoobCommonMove } from '../lib/chess/getCommonMove.ts';
	import ChapterPicker, { type StudyChapter } from '../components/ChapterPicker.svelte';
	import MoveSearch from '../components/MoveSearch.svelte';
	import type { StudyValidity } from '../components/StudyValidator.svelte';
	import StudyValidator from '../components/StudyValidator.svelte';
	import Choobser, { type ChessMove, type MoveType } from '../components/Choobser.svelte';
	

	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();
	});

	let chess = $state(new SvelteChess());
	type ColorChoice = Color | 'random';
	let playerColor = $state<Color>('w');
	let playerColorChoice = $state<ColorChoice>('w');

	let startingFen = $state<string>('');
	let selectedChapter = $state<StudyChapter>();

	let choobHistory = $state<ChoobHistory>([]);
	
	let studyValidity: StudyValidity = $state('invalid');
	

	let studyId = $state('');
	let studyIsPublic = $state(true);
	
	onMount(() => {
		const savedStudyId = window.localStorage.getItem('studyId');
		if (savedStudyId) studyId = savedStudyId;
	});
	$effect(() => {
		window.localStorage.setItem('studyId', studyId);
	});

	

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

	
	type MaybeGetEngineEvaluation = ((fen: string) => Promise<ChoobEvaluation>) | null
	let getEngineEvaluation: MaybeGetEngineEvaluation = $state(null)
	const makeAndRecordMove = async (move: ChessMove, source: MoveType) => {
		chess.move(move);
		const history = chess.chess.history();
		const engine = (getEngineEvaluation as MaybeGetEngineEvaluation)?.(chess.fen);
		const common = getCommonMove({
			apiToken: authToken?.token?.value,
			fen: chess.fen,
		});
		addEntryToHistory(chess.turn === 'w' ? 'b' : 'w', {
			...(await engine),
			san: history[history.length - 1],
			moveSource: source,
			winPercents: (await common)?.winPercents,
		});
		
	};
	let registerOnMoveHandler: ((handler: onMoveHandler) => void) | null = $state(null)
	
	const recordMove = async (from: string, to: string) => {

		const history = chess.chess.history();
		const evaluation = (getEngineEvaluation as MaybeGetEngineEvaluation)?.(chess.chess.fen());
		const common = getCommonMove({
			apiToken: authToken?.token?.value,
			fen: chess.fen,
		});
		addEntryToHistory(chess.chess.turn() === 'w' ? 'b' : 'w', {
			...(await evaluation),
			san: history[history.length - 1],
			moveSource: 'player',
			winPercents: (await common)?.winPercents,
		});			
	}

	function resetBoard(fen?: string) {
		chess = new SvelteChess(fen ?? DEFAULT_FEN);
		choobHistory = [];
	}

	let playChoobMove: (() => void) | null = $state(null)
	function restartGame() {
		playerColor = playerColorChoice === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : playerColorChoice;
		if (playerColor === 'b') playChoobMove?.();
	}
</script>

<button onclick={() => login.login()}> bello </button>
<button onclick={() => login.logout()}> buhbye </button>
<p><b>Access token:</b> {authToken?.token?.value || 'Not logged in'}</p>
<ChessBoard {chess}{playerColor} {playChoobMove} {recordMove}/>

<div>
	<label><input type="radio" bind:group={playerColorChoice} value="w" />White</label>
	<label><input type="radio" bind:group={playerColorChoice} value="random" />Random</label>
	<label><input type="radio" bind:group={playerColorChoice} value="b" />Black</label>
</div>

<div class="mb-4">
	<button
		onclick={() => {
			resetBoard(selectedChapter?.fenToPlayFrom ?? startingFen);
			restartGame();
		}}>New Game</button
	>
</div>

<StudyValidator bind:studyId bind:studyIsPublic bind:studyValidity />
<ChapterPicker bind:selectedChapter {studyId} />
<Choobser {studyId} {studyValidity} {studyIsPublic} {chess} doMove={makeAndRecordMove} {registerOnMoveHandler} bind:playChoobMove={playChoobMove}/>

<MoveSearch {studyId} {resetBoard} />
<br />

<button
	onclick={() => window.open(`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`, '_blank')}
>
	Lichess Button
</button>

<p>Starting FEN</p>
<p>
	<input type="text" bind:value={startingFen} placeholder="Input FEN..." />
</p>

<button onclick={() => (startingFen = chess.fen)}>Make current FEN starting FEN</button>

<table>
	<thead>
		<tr class="*:px-3">
			<td>Move</td>
			<td>Eval</td>
			<td>Source</td>
			<td>Win% (W)</td>
			<td>Move</td>
			<td>Eval</td>
			<td>Source</td>
			<td>Win% (W)</td>
		</tr>
	</thead>
	<tbody>
		{#each choobHistory as entry (entry)}
			<tr class="*:text-center">
				<td>{entry[0].san}</td>
				<td>{entry[0].centipawns}</td>
				<td>{entry[0].moveSource}</td>
				<td>{Math.round((entry[0].winPercents?.white ?? 0) * 100) || '-'}</td>
				<td>{entry[1]?.san ?? '-'}</td>
				<td>{entry[1]?.centipawns ?? '-'}</td>
				<td>{entry[1]?.moveSource ?? '-'}</td>
				<td>{Math.round((entry[1]?.winPercents?.white ?? 0) * 100) || '-'}</td>
			</tr>
		{/each}
	</tbody>
</table>
