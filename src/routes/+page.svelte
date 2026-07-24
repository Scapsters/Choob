<script module lang="ts">
	import type { ChoobEvaluation } from '../lib/chess/getCloudEvaluation.ts';

	export type MaybeGetEngineEvaluation = ((fen: string) => Promise<ChoobEvaluation>) | null;

	export const prerender = false;
</script>

<script lang="ts">
	import 'svelte5-chessground/style.css';
	import ChessBoard, { SvelteChess } from '../components/ChessBoard.svelte';
	import { type Color } from 'chess.js';
	import { DEFAULT_FEN } from '../lib/chess/getStudyMove.ts';
	import ChapterPicker from '../components/ChapterPicker.svelte';
	import MoveSearch from '../components/MoveSearch.svelte';
	import type { StudyValidity } from '../components/StudyValidator.svelte';
	import StudyValidator from '../components/StudyValidator.svelte';
	import Choobser from '../components/Choobser.svelte';
	import GameHistory, { type ChoobHistory, type RecordMove } from '../components/GameHistory.svelte';
	import LichessLogin from '../components/LichessLogin.svelte';
	import RadioInput from '../components/ui/RadioInput.svelte';
	import Checkbox from '../components/ui/Checkbox.svelte';
	import Button from '../components/ui/Button.svelte';

	let chess = $state(new SvelteChess());

	type ColorChoice = Color | 'random' | null;
	let playerColor = $state<Color>('w');
	let playerColorChoice = $state<ColorChoice>('w');

	let startingFen = $state<string>(DEFAULT_FEN);

	let studyValidity: StudyValidity = $state('invalid');
	let studyId = $state('');
	let studyIsPublic = $state(false);

	let maybeGetEngineEvaluation: MaybeGetEngineEvaluation = $state(null);

	let recordMove: RecordMove = $state(null);
	let choobHistory = $state<ChoobHistory>([]);
	function getPositionToSave() {
		return {
			startingFen: startingFen,
			pgn: chess.chess.pgn(),
			choobHistory: $state.snapshot(choobHistory),
		};
	}
	let savedPosition = $state<{
		startingFen: string;
		pgn: string;
		choobHistory: ChoobHistory;
	}>(getPositionToSave());

	function setBoard(fen?: string) {
		startingFen = fen ?? DEFAULT_FEN;
		chess.setBoard(fen ?? DEFAULT_FEN);
		choobHistory = [];
	}

	let isChoobEnabled = $state(false);
	let playChoobve: (() => void) | null = $state(null);
	function playChoobveIfPossible() {
		if (chess.turn !== playerColor && isChoobEnabled) playChoobve?.();
	}

	function setPlayerColorChoice(v: ColorChoice) {
		playerColorChoice = v;
		refreshPlayerColorChoice();
		playChoobveIfPossible();
	}
	function refreshPlayerColorChoice() {
		playerColor = (playerColorChoice === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : playerColorChoice) ?? 'w';
	}
</script>

<div class="grid grid-flow-col grid-rows-4 xl:grid-rows-2 gap-6 justify-center mx-auto p-6 max-w-400">
	<div class="flex justify-center min-w-0 grow basis-80">
		<div class="max-w-150 w-full">
			<ChessBoard {chess} {playerColor} {isChoobEnabled} {playChoobveIfPossible} {recordMove} />
		</div>
	</div>

	<div class="flex flex-col items-center gap-6">
		<div class="flex h-min">
			<div class="flex flex-col items-center gap-3 p-3">
				{@render divider()}
				<div class="flex gap-3 w-full">
					<div class="grow w-full"></div>
					{@render colorSettings()}
					<div class="grow w-full flex justify-end items-center">
						<Button disabled={chess.fen === DEFAULT_FEN} onclick={() => setBoard()}>Reset Board</Button>
					</div>
				</div>
				<div class="flex gap-3">{@render gameControls()}</div>
				{@render divider()}
			</div>
		</div>
		<div class="flex flex-col">
			<div class="flex justify-center">
				<Choobser
					bind:playChoobve
					bind:isChoobEnabled
					{recordMove}
					{chess}
					{studyId}
					{studyValidity}
					{studyIsPublic}
					bind:maybeGetEngineEvaluation
				/>
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
		{#if studyId}
			<div class="flex w-full justify-between flex-wrap gap-x-3 gap-y-6">
				<ChapterPicker {setBoard} {studyId} {studyValidity} />
				<MoveSearch {setBoard} {studyId} {chess} />
			</div>
		{/if}
	</div>

	<div class="flex flex-col gap-3 items-center">
		{@render lichessButton()}
		<GameHistory bind:recordMove bind:choobHistory {maybeGetEngineEvaluation} />
	</div>
</div>

{#snippet gameControls()}
	<label class="flex gap-3 items-center"
		>Allow Choob to move<Checkbox
			class="toggle"
			bind:checked={
				() => isChoobEnabled,
				(v) => {
					isChoobEnabled = v;
					playChoobveIfPossible();
				}
			}
		/></label
	>
	<Button
		onclick={() => {
			savedPosition = getPositionToSave();
		}}>Set Board Checkpoint</Button
	>
	<Button
		disabled={savedPosition.startingFen === DEFAULT_FEN}
		onclick={() => {
			if (!savedPosition) return;
			chess = new SvelteChess(savedPosition.startingFen).loadPgn(savedPosition.pgn);
			choobHistory = structuredClone($state.snapshot(savedPosition.choobHistory));
			refreshPlayerColorChoice();
			playChoobveIfPossible?.();
		}}>Restore Board Checkpoint</Button
	>
{/snippet}

{#snippet colorSettings()}
	<label class="flex flex-col items-end w-15"
		><RadioInput bind:selected={() => playerColorChoice, setPlayerColorChoice} value="w" /> White</label
	>
	<label class="flex flex-col items-center"
		><RadioInput bind:selected={() => playerColorChoice, setPlayerColorChoice} value="b" /> Black</label
	>
	<label class="flex flex-col items-start w-15"
		><RadioInput bind:selected={() => playerColorChoice, setPlayerColorChoice} value="random" /> Random</label
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
