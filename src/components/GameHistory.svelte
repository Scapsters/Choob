<script module lang="ts">
	export type ChoobHistory = [ChoobHistoryEntry, ChoobHistoryEntry | null][];
	export type ChoobHistoryEntry = Partial<ChoobEvaluation> & {
		san: string;
		moveType: MoveType;
		winPercents?: ChoobCommonMove['winPercents'];
		studyDeviation?: string;
	};

	export type RecordMove = ((chess: SvelteChess, source: MoveType, previousFEN: string) => Promise<void>) | null;
</script>

<script lang="ts">
	import { getCommonMove, type ChoobCommonMove } from '$lib/chess/getCommonMove';
	import { auth } from '$lib/login.svelte';
	import type { Color } from 'chess.js';
	import type { MoveType } from './Choobser.svelte';
	import type { MaybeGetEngineEvaluation } from '../routes/+page.svelte';
	import type { SvelteChess } from './ChessBoard.svelte';
	import type { ChoobEvaluation } from '$lib/chess/getCloudEvaluation';
	import Button from './ui/Button.svelte';
	import Checkbox from './ui/Checkbox.svelte';
	import NumberInput from './ui/NumberInput.svelte';
	import { getStudyMove } from '$lib/chess/getStudyMove';

	let {
		maybeGetEngineEvaluation,
		recordMove = $bindable(),
		choobHistory = $bindable(),
		isGameOver = $bindable(),
		studyId,
		disableMostCommonMoves,
		forceEngine,
		chess,
	}: {
		maybeGetEngineEvaluation: MaybeGetEngineEvaluation;
		recordMove: RecordMove;
		choobHistory: ChoobHistory;
		chess: SvelteChess;
		studyId: string;
		disableMostCommonMoves: boolean;
		forceEngine: boolean;
		isGameOver: boolean;
	} = $props();

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

	/**
	 * Record the last move made in the given chess object. Adds eval, common move info,
	 */
	recordMove = async function (chess: SvelteChess, moveType: MoveType, previousFEN: string) {
		const history = chess.chess.history();
		const evaluation = (maybeGetEngineEvaluation as MaybeGetEngineEvaluation)?.(chess.fen);
		const winPercents = recordWinPercent && !disableMostCommonMoves
			? (
					await getCommonMove({
						apiToken: auth?.token?.value,
						fen: chess.fen,
					})
				)?.winPercents
			: undefined;

		const studyMovesTheyCouldHavePlayed =
			(await getStudyMove(studyId, previousFEN, auth.token?.value, false))?.map((move) => move.notation.notation) || [];
		const moveTheyPlayed = chess.history[chess.history.length - 1];
		const studyDeviation =
			(studyMovesTheyCouldHavePlayed.length > 0 &&
				studyMovesTheyCouldHavePlayed?.every((studyMove) => studyMove !== moveTheyPlayed) &&
				studyMovesTheyCouldHavePlayed[0]) ||
			undefined;

		addEntryToHistory(chess.chess.turn() === 'w' ? 'b' : 'w', {
			...(await evaluation),
			san: history[history.length - 1],
			moveType,
			winPercents,
			studyDeviation,
		});

		forceEngine = false;
		maybeEndGame();
	};

	function maybeEndGame() {
		if (choobHistory.length === 0) return;

		const lastMove = choobHistory[choobHistory.length - 1].findLast((entry) => !!entry) as ChoobHistoryEntry;
		if (lastMove.moveType !== 'player') return;

		const secondToLastMove = choobHistory[choobHistory.length - 1][1]
			? choobHistory[choobHistory.length - 1][0]
			: choobHistory[choobHistory.length - 2][1];
		const firstMove = choobHistory[0][0];

		const sumWinPercentCounts = (move: ChoobHistoryEntry) =>
			Object.values(move.winPercents || {}).reduce((pv, v) => pv + v, 0);
		const isPositionRareEnough = sumWinPercentCounts(lastMove) / sumWinPercentCounts(firstMove) < rarityThreshold; // 0/0 goes to NaN goes to false (:

		const wasLastMoveBadEnough =
			typeof lastMove.centipawns === 'string' || // They blundered mate
			typeof secondToLastMove?.centipawns === 'string' || // They lost mate
			(lastMove.centipawns !== undefined &&
				secondToLastMove?.centipawns !== undefined &&
				Math.abs(lastMove.centipawns - secondToLastMove?.centipawns) > blunderThreshold);

		if (!endOnRarity && !endOnBlunder && !endOnDeviation) return;
		if (endOnBlunder && wasLastMoveBadEnough) {
			if (useEngineOnBlunder) {
				forceEngine = true;
			} else {
				endGame()
			}
			return;
		}
		if (endOnDeviation && lastMove.studyDeviation) {
			endGame()
			return;
		}
		if (endOnRarity && isPositionRareEnough) {
			endGame()
			return;
		}
	}

	async function endGame() {
		const lastMove = choobHistory[choobHistory.length - 1].findLast((entry) => !!entry) as ChoobHistoryEntry;
		if (!lastMove.winPercents) {
			lastMove.winPercents = (
				await getCommonMove({
					apiToken: auth?.token?.value,
					fen: chess.fen,
				})
			)?.winPercents
		}
		isGameOver = true;
	}

	let recordWinPercent = $state(false);
	let showStudyDeviations = $state(true);
	let showEvaluation = $state(false);
	let showMoveSource = $state(false);

	let endOnDeviation = $state(false);
	let endOnBlunder = $state(false);
	let userEndOnRarity = $state(false);
	let endOnRarity = $derived(disableMostCommonMoves ? false : userEndOnRarity);

	let rarityThreshold = $state(0.5);
	let blunderThreshold = $state(250);

	let useEngineOnBlunder = $state(false);
</script>

<div class="grid grid-rows-[1fr,1fr,1fr] gap-y-3 w-full">
	<div class="flex justify-center items-center flex-col lg:flex-row lex-wrap gap-6">
		<div class="flex flex-col items-center gap-2">
			<div class="flex gap-3">
				<p>Game Status:</p>
				<p class="font-bold">{isGameOver ? 'Ended' : 'Active'}</p>
			</div>
			<Button onclick={() => (isGameOver = !isGameOver)}>
				{isGameOver ? 'Start Game' : 'End Game'}
			</Button>
		</div>

		<div class="flex items-center gap-3">

			<p class="text-center">End Game on:</p>
			<div class="grid grid-cols-1 grid-rows-4 lg:grid-cols-2 lg:grid-rows-2 grid-flow-col gap-x-3 gap-y-1">
				<div class="flex gap-3">
					<label class="flex gap-2 items-center">Rare Position<Checkbox bind:checked={userEndOnRarity} disabled={disableMostCommonMoves}/></label>
				<label
					class={`${endOnRarity ? 'bg-(--background-gray)' : 'bg-(--disabled-color)/25 text-(--disabled-color)/75'} rounded-sm pr-1 pb-1`}
					><NumberInput
						bind:value={rarityThreshold}
						min="0"
						max="100"
						class="[&:disabled]:bg-transparent max-w-9.5"
						disabled={!endOnRarity}
					/>
					%</label
				>
			</div>
			<div class="flex gap-3">
				<label class="flex gap-2 items-center">Study Deviation<Checkbox bind:checked={endOnDeviation} /></label>
			</div>
			<div class="flex gap-3">
				<label class="flex gap-2 items-center">Blunder<Checkbox bind:checked={endOnBlunder} /></label>
				<label
					class={`${endOnBlunder ? 'bg-(--background-gray)' : 'bg-(--disabled-color)/25 text-(--disabled-color)/75'} rounded-sm px-1 pb-1`}
					>±<NumberInput
						bind:value={blunderThreshold}
						min="0"
						max="100"
						class="[&:disabled]:bg-transparent"
						disabled={!endOnBlunder}
					/>
					<span class="text-sm">centipawns</span></label
					>
			</div>
			<div class="flex gap-3">
				<label class="flex gap-2 items-center"
					>Allow Engine Punishment<Checkbox bind:checked={useEngineOnBlunder} disabled={!endOnBlunder} /></label
				>
			</div>
		</div>
		</div>
	</div>

	<div class="w-60 lg:w-full border-b-1 border-(--foreground-gray) justify-self-center"></div>
	
	<div class="flex justify-center items-center gap-3">
		<p>Show during game:</p>

		<div class="flex flex-col xl:flex-row flex-wrap gap-x-6">	
			<label class="flex gap-2 items-center">
				Win %<Checkbox bind:checked={recordWinPercent} />
			</label>
			
			<label class="flex gap-2 items-center">
				Evaluation<Checkbox bind:checked={showEvaluation} />
			</label>
			
			<label class="flex gap-2 items-center">
				Move Source<Checkbox bind:checked={showMoveSource} />
			</label>

			<label class="flex gap-2 items-center">
				Study Deviations<Checkbox bind:checked={showStudyDeviations} />
			</label>
		</div>
	</div>

	<div class="h-max flex flex-col items-center overflow-x-scroll">
		<table>
			<thead>
				<tr class="*:px-3">
					<td>#</td>
					<td>Move</td>
					{#if showStudyDeviations || isGameOver}
						<td>Deviation</td>
					{/if}
					{#if showEvaluation || isGameOver}
						<td>Eval</td>
					{/if}
					{#if showMoveSource || isGameOver}
						<td>Source</td>
					{/if}
					{#if recordWinPercent || isGameOver}
						<td>Win% (W)</td>
					{/if}
					<td>Move</td>
					{#if showStudyDeviations || isGameOver}
						<td>Deviation</td>
					{/if}
					{#if showEvaluation || isGameOver}
						<td>Eval</td>
					{/if}
					{#if showMoveSource || isGameOver}
						<td>Source</td>
					{/if}
					{#if recordWinPercent || isGameOver}
						<td>Win% (W)</td>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each choobHistory as entry, i (entry)}
					<tr class="*:text-center">
						<td>{i + 1}.</td>
						<td>{entry[0].san}</td>
						{#if showStudyDeviations}
							<td>{entry[0].studyDeviation ?? '-'}</td>
						{/if}
						{#if showEvaluation || isGameOver}
							<td class={`${entry[0].evalSource === 'local' ? 'text-(--foreground)/60' : ''}`}>{entry[0].centipawns}</td
							>
						{/if}
						{#if showMoveSource || isGameOver}
							<td>{entry[0].moveType}</td>
						{/if}
						{#if recordWinPercent || isGameOver}
							<td>{Math.round((entry[0].winPercents?.white ?? 0) * 100) || '-'}</td>
						{/if}

						<td>{entry[1]?.san ?? '-'}</td>
						{#if showStudyDeviations}
							<td>{entry[1]?.studyDeviation ?? '-'}</td>
						{/if}
						{#if showEvaluation || isGameOver}
							<td class={`${entry[1]?.evalSource === 'local' ? 'text-(--foreground)/60' : ''}`}
								>{entry[1]?.centipawns ?? '-'}</td
							>
						{/if}
						{#if showMoveSource || isGameOver}
							<td>{entry[1]?.moveType ?? '-'}</td>
						{/if}
						{#if recordWinPercent || isGameOver}
							<td>{Math.round((entry[1]?.winPercents?.white ?? 0) * 100) || '-'}</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="flex justify-center">
		<Button
			onclick={() => window.open(`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`, '_blank')}
		>
			Lichess Button
		</Button>
	</div>
</div>
