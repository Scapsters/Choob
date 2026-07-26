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
	import ThemeToggle from '../components/ThemeToggle.svelte';
	import Button from '../components/ui/Button.svelte';
	import Checkbox from '../components/ui/inputs/Checkbox.svelte';
	import RadioInput from '../components/ui/inputs/RadioInput.svelte';
	import Accordion from '../components/ui/Accordion.svelte';
	import { MediaQuery } from 'svelte/reactivity';

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
	let isGameOver = $state(false);
	let maybeEndGame: ((reason: string) => Promise<void>) | null = $state(null);
	let forceEngine = $state(false);
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

	let disableMostCommonMoves = $state(true);
	let disableCloudEngine = $state(false);

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

	let isMobile = new MediaQuery('(max-width: 1279px)');
</script>

<div
	class="
grid-flow-col gap-x-6 gap-y-0 xl:gap-y-6 justify-center mx-auto max-w-400
flex flex-col p-1
xl:grid xl:grid-cols-[1fr,1fr] xl:grid-rows-2 xl:p-6
"
>
	<div class="flex justify-center min-w-0 basis-80">
		<div class="max-w-150 w-full">
			<ChessBoard {chess} {playerColor} {isChoobEnabled} {choobHistory} {playChoobveIfPossible} {recordMove} />
		</div>
	</div>

	<Accordion title="Game Controls" actuallyUseAccordion={isMobile.current}>
		<div class="flex flex-col items-center gap-3 p-3">
			<div class="flex h-min">
				<div class="flex flex-col items-center gap-3 p-3">
					{@render divider()}
					<div class="flex gap-3 w-full">
						<div class="grow lg:w-full"></div>
						{@render colorSettings()}
						<div class="grow w-full flex justify-end items-center">
							<Button
								disabled={chess.fen === DEFAULT_FEN}
								onclick={() => {
									setBoard();
									playChoobveIfPossible();
									isGameOver = false;
								}}>Reset Board</Button
							>
						</div>
					</div>
					<div class="flex gap-3 flex-wrap justify-center">{@render gameControls()}</div>
					{@render divider()}
				</div>
			</div>
			<div class="flex flex-col gap-6">
				<div class="flex justify-center">
					<Choobser
						bind:playChoobve
						bind:isChoobEnabled
						{recordMove}
						{chess}
						{studyId}
						{forceEngine}
						{studyValidity}
						{disableMostCommonMoves}
						{disableCloudEngine}
						{studyIsPublic}
						{maybeEndGame}
						bind:maybeGetEngineEvaluation
					/>
				</div>
				<div class="flex flex-col items-center gap-3">
					<p>API Settings (For rate limits)</p>
					<div class="flex flex-col gap-1">
						<label class="flex gap-3 items-center"
							><Checkbox bind:checked={disableMostCommonMoves} /> Disable Some Common Moves</label
						>
						<label class="flex gap-3 items-center"
							><Checkbox bind:checked={disableCloudEngine} /> Disable Cloud Engine</label
						>
					</div>
				</div>
			</div>
		</div>
	</Accordion>

	<Accordion title="Study Settings" actuallyUseAccordion={isMobile.current}>
		<div class="flex flex-col gap-3 items-start grow p-3">
			<div class="flex max-w-200 w-full flex-col items-center gap-3">
				{#if !isMobile.current}
					{@render loginAndTheme()}
				{/if}
				{@render divider(true)}
				<StudyValidator bind:studyId bind:studyIsPublic bind:studyValidity />
				{@render divider()}
			</div>
			{#if studyId}
				<div class="flex w-full justify-between flex-wrap xl:flex-nowrap gap-x-12 gap-y-6">
					<div class="h-full grow">
						<ChapterPicker {setBoard} {studyId} {studyValidity} {playChoobveIfPossible} />
					</div>
					<div class="h-full grow justify-self-end">
						<MoveSearch {setBoard} {studyId} {chess} {playChoobveIfPossible} />
					</div>
				</div>
			{/if}
		</div>
	</Accordion>

	<Accordion title="History" actuallyUseAccordion={isMobile.current}>
		<div class="flex flex-col gap-3 items-center p-3 2xl:w-210">
			<GameHistory
				{chess}
				{studyId}
				{forceEngine}
				{disableMostCommonMoves}
				bind:maybeEndGame
				bind:isGameOver
				bind:recordMove
				bind:choobHistory
				{maybeGetEngineEvaluation}
			/>
		</div>
	</Accordion>

	{#if isMobile.current}
		<div class="h-6"></div>
		{@render loginAndTheme()}
	{/if}
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
	<div class="flex flex-wrap gap-3">
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
				isGameOver = false;
			}}>Restore Checkpoint</Button
		>
	</div>
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

{#snippet divider(invisibleOnMobile?: boolean)}
	<div class={`${invisibleOnMobile ? 'hidden xl:block' : ''} w-full border-b-1 border-(--foreground-gray)`}></div>
{/snippet}

{#snippet loginAndTheme()}
	<div class="flex flex-wrap justify-center items-center w-full gap-3">
		<div class="xl:w-30"></div>
		<div class="grow flex justify-center">
			<LichessLogin />
		</div>
		<div class="w-30 flex xl:justify-end">
			<ThemeToggle />
		</div>
	</div>
{/snippet}
