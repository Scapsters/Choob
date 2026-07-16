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
	import type { Color } from 'chess.js';
	import { DEFAULT_FEN } from '../lib/chess/getStudyMove.ts';
	import { type ChoobCommonMove } from '../lib/chess/getCommonMove.ts';
	import ChapterPicker, { type StudyChapter } from '../components/ChapterPicker.svelte';
	import MoveSearch from '../components/MoveSearch.svelte';
	import type { StudyValidity } from '../components/StudyValidator.svelte';
	import StudyValidator from '../components/StudyValidator.svelte';
	import Choobser, { type MoveType } from '../components/Choobser.svelte';
	import GameHistory, { type RecordMove } from '../components/GameHistory.svelte';
	import LichessLogin from '../components/LichessLogin.svelte';

	let chess = $state(new SvelteChess());
	
	type ColorChoice = Color | 'random' | null;
	let playerColor = $state<Color>();
	let playerColorChoice = $state<ColorChoice>(null);

	let startingFen = $state<string>('');
	let selectedChapter = $state<StudyChapter>();

	let studyValidity: StudyValidity = $state('invalid');

	let studyId = $state('');
	let studyIsPublic = $state(true);

	let getEngineEvaluation: MaybeGetEngineEvaluation = $state(null);

	let recordMove: RecordMove = $state(null);
	let resetHistory: (() => void) | null = $state(null);

	let isChoobEnabled = $state(false)

	function resetBoard(fen?: string) {
		chess = new SvelteChess(fen ?? DEFAULT_FEN);
		resetHistory?.();
	}

	let playChoobve: (() => void) | null = $state(null);
	function restartGame() {
		if (playerColorChoice === null) return

		playerColor = playerColorChoice === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : playerColorChoice;

		if (playerColor === 'b') playChoobve?.();
	}
</script>

<LichessLogin />
<ChessBoard {chess} {playerColor} {isChoobEnabled} {playChoobve} {recordMove} />

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

<Choobser bind:playChoobve bind:isChoobEnabled {recordMove} {chess} {studyId} {studyValidity} {studyIsPublic} />

<MoveSearch {resetBoard} {studyId} />

<p>Starting FEN</p>
<p>
	<input type="text" bind:value={startingFen} placeholder="Input FEN..." />
</p>
<button onclick={() => (startingFen = chess.fen)}>Make current FEN starting FEN</button>

<GameHistory bind:recordMove bind:resetHistory {getEngineEvaluation} />

<button
	onclick={() => window.open(`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`, '_blank')}
>
	Lichess Button
</button>
