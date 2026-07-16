<script module>
	import type { ChoobEvaluation } from '../lib/chess/getCloudEvaluation.ts';

	export type ChoobHistoryEntry = Partial<ChoobEvaluation> & {
		san: string;
		moveType: MoveType;
		winPercents?: ChoobCommonMove['winPercents'];
	};
	export type ChoobHistory = [ChoobHistoryEntry, ChoobHistoryEntry | null][];

	export type MaybeGetEngineEvaluation = ((fen: string) => Promise<ChoobEvaluation>) | null;

	export const ssr = false;
	export const prerender = false;
</script>

<script lang="ts">
	import 'svelte5-chessground/style.css';
	import ChessBoard, { SvelteChess } from '../components/ChessBoard.svelte';
	import { Chess, type Color } from 'chess.js';
	import { DEFAULT_FEN } from '../lib/chess/getStudyMove.ts';
	import { type ChoobCommonMove } from '../lib/chess/getCommonMove.ts';
	import ChapterPicker, { type StudyChapter } from '../components/ChapterPicker.svelte';
	import MoveSearch from '../components/MoveSearch.svelte';
	import type { StudyValidity } from '../components/StudyValidator.svelte';
	import StudyValidator from '../components/StudyValidator.svelte';
	import Choobser, { type MoveType } from '../components/Choobser.svelte';
	import GameHistory, { type RecordMove } from '../components/GameHistory.svelte';
	import LichessLogin from '../components/LichessLogin.svelte';
	import Button from '../components/ui/Button.svelte';

	let chess = $state(new SvelteChess());

	type ColorChoice = Color | 'random' | null;
	let playerColor = $state<Color>();
	let playerColorChoice = $state<ColorChoice>('w');

	let startingFen = $state<string>('');
	let selectedChapter = $state<StudyChapter>();
	$effect(() => {
		const fenToPlayFrom = selectedChapter?.fenToPlayFrom
		if (fenToPlayFrom) chess = new SvelteChess(fenToPlayFrom)
	})

	let studyValidity: StudyValidity = $state('invalid');

	let studyId = $state('');
	let studyIsPublic = $state(true);

	let getEngineEvaluation: MaybeGetEngineEvaluation = $state(null);

	let recordMove: RecordMove = $state(null);
	let resetHistory: (() => void) | null = $state(null);

	let isChoobEnabled = $state(false);

	function resetBoard() {
		chess = new SvelteChess(chess.fen ?? DEFAULT_FEN);
		resetHistory?.();
	}

	let playChoobve: (() => void) | null = $state(null);
	function playChoobveIfPossible() {
		if (chess.turn !== playerColor && isChoobEnabled) playChoobve?.();
	}
	function startGame() {
		if (playerColorChoice === null) return;
		playerColor = playerColorChoice === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : playerColorChoice;

		game.isActive = true
		playChoobveIfPossible();
	}

	let game = $state({
		isActive: false
	})
</script>

<LichessLogin />
<ChessBoard bind:startingFen {chess} {playerColor} {isChoobEnabled} {playChoobveIfPossible} {recordMove} />

<div>
	<label><input type="radio" bind:group={playerColorChoice} value="w" />White</label>
	<label><input type="radio" bind:group={playerColorChoice} value="random" />Random</label>
	<label><input type="radio" bind:group={playerColorChoice} value="b" />Black</label>
</div>
<div class="mb-4">
		<Button
			disabled={!playerColorChoice}
			onclick={() => {
				isChoobEnabled = true;
				startGame();
			}}>Start new game from here</Button
		>
	<Button
		disabled={!playerColorChoice || chess.history.length === 0 || !isChoobEnabled}
		onclick={() => {
			isChoobEnabled = true;
			resetBoard();
			startGame();
		}}>Restart game</Button
	>
	<Button
		disabled={!game.isActive}
		onclick={() => {
			isChoobEnabled = !isChoobEnabled;
		}}>{(isChoobEnabled || !game.isActive) ? "Stop Choob" : "Start Choob"}</Button
	>
</div>

<StudyValidator bind:studyId bind:studyIsPublic bind:studyValidity />

<ChapterPicker bind:selectedChapter {studyId} />

<Choobser bind:playChoobve bind:isChoobEnabled {recordMove} {chess} {studyId} {studyValidity} {studyIsPublic} />

<MoveSearch {resetBoard} {studyId} />

<GameHistory bind:recordMove bind:resetHistory {getEngineEvaluation} />

<button
	onclick={() => window.open(`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`, '_blank')}
>
	Lichess Button
</button>
