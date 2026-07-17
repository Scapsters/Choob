<script module lang="ts">
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
	import { type Color } from 'chess.js';
	import { DEFAULT_FEN } from '../lib/chess/getStudyMove.ts';
	import { type ChoobCommonMove } from '../lib/chess/getCommonMove.ts';
	import ChapterPicker, { type StudyChapter } from '../components/ChapterPicker.svelte';
	import MoveSearch from '../components/MoveSearch.svelte';
	import type { StudyValidity } from '../components/StudyValidator.svelte';
	import StudyValidator from '../components/StudyValidator.svelte';
	import Choobser, { type MoveType } from '../components/Choobser.svelte';
	import GameHistory, { type RecordMove } from '../components/GameHistory.svelte';
	import LichessLogin from '../components/LichessLogin.svelte';
	import RadioInput from '../components/ui/RadioInput.svelte';
	import Checkbox from '../components/ui/Checkbox.svelte';
	import Button from '../components/ui/Button.svelte';

	let chess = $state(new SvelteChess());

	type ColorChoice = Color | 'random' | null;
	let playerColor = $state<Color>();
	let playerColorChoice = $state<ColorChoice>('w');

	let startingFen = $state<string>('');
	let selectedChapter = $state<StudyChapter>();
	$effect(() => {
		const fenToPlayFrom = selectedChapter?.fenToPlayFrom;
		if (fenToPlayFrom) chess = new SvelteChess(fenToPlayFrom);
	});

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

		game.isActive = true;
		playChoobveIfPossible();
	}

	let game = $state({
		isActive: false,
	});
</script>

<div class="grid grid-flow-col grid-rows-4 xl:grid-rows-2 gap-6 justify-center mx-auto p-6 max-w-400">
	<div class="flex justify-center min-w-0 grow basis-80">
		<div class="max-w-150 w-full">
			<ChessBoard bind:startingFen {chess} {playerColor} {isChoobEnabled} {playChoobveIfPossible} {recordMove} />
		</div>
	</div>

	<div class="flex flex-col items-center gap-6">
		<div class="flex h-min">
			<div class="flex flex-col items-center gap-3 p-3">
				{@render divider()}
				<div class="flex gap-3">{@render colorSettings()}</div>
				<div class="flex gap-3">{@render gameControls()}</div>
				{@render divider()}
			</div>
		</div>
		<div class="flex flex-col">
			<div class="flex justify-center">
				<Choobser bind:playChoobve bind:isChoobEnabled {recordMove} {chess} {studyId} {studyValidity} {studyIsPublic} />
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-6 items-start grow basis-80">
		<div class="flex w-full flex-col items-center gap-3">
			<LichessLogin />
			{@render divider()}
			<StudyValidator bind:studyId bind:studyIsPublic bind:studyValidity />
			{@render divider()}
		</div>
		<div class="flex w-full justify-between flex-wrap gap-x-3 gap-y-6">
			<ChapterPicker bind:selectedChapter {studyId} />
			<MoveSearch {resetBoard} {studyId} />
		</div>
	</div>

	<div class="flex flex-col gap-3 items-center">
		{@render lichessButton()}
		<GameHistory bind:recordMove bind:resetHistory {getEngineEvaluation} />
	</div>
</div>

{#snippet gameControls()}
	<label class="flex gap-3 items-center">Allow Choob to move <Checkbox class="toggle" /></label>
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
		}}>{isChoobEnabled || !game.isActive ? 'Stop Choob' : 'Start Choob'}</Button
	>
{/snippet}

{#snippet colorSettings()}
	<label class="flex flex-col items-end w-15"><RadioInput bind:group={playerColorChoice} value="w" /> White</label>
	<label class="flex flex-col items-center"><RadioInput bind:group={playerColorChoice} value="b" /> Black</label>
	<label class="flex flex-col items-start w-15"
		><RadioInput bind:group={playerColorChoice} value="random" /> Random</label
	>
{/snippet}

{#snippet lichessButton()}
	<Button
		onclick={() => window.open(`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`, '_blank')}
	>
		Lichess Button
	</Button>
{/snippet}

{#snippet divider()}
	<div class="w-full border-b-1 border-(--foreground-gray)"></div>
{/snippet}
