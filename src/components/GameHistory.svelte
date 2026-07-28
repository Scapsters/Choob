<script module lang="ts">
	export type ChoobHistory = [ChoobHistoryEntry, ChoobHistoryEntry | null][];
	export type ChoobHistoryEntry = Partial<ChoobEvaluation> & {
		san: string;
		moveType: MoveType;
		winPercents?: ChoobCommonMove['winPercents'];
		studyDeviation?: string;
	};

	export type RecordMove =
		| ((
				chess: SvelteChess,
				source: MoveType,
				previousFEN: string,
				commonMove?: ChoobCommonMove | false | null
		  ) => Promise<void>)
		| null;
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
	import { getStudyMove } from '$lib/chess/getStudyMove';
	import Checkbox from './ui/inputs/Checkbox.svelte';
	import NumberInput from './ui/inputs/NumberInput.svelte';
	import InfoTooltip from './ui/InfoTooltip.svelte';

	let {
		maybeGetEngineEvaluation,
		recordMove = $bindable(),
		choobHistory = $bindable(),
		isGameOver = $bindable(),
		maybeEndGame = $bindable(),
		studyId,
		disableMostCommonMoves,
		forceEngine,
		chess,
	}: {
		maybeGetEngineEvaluation: MaybeGetEngineEvaluation;
		recordMove: RecordMove;
		maybeEndGame: ((reason: string) => Promise<void>) | null;
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
	recordMove = async function (
		chess: SvelteChess,
		moveType: MoveType,
		previousFEN: string,
		commonMove?: ChoobCommonMove | false | null
	) {
		const history = chess.chess.history();
		const evaluation = (maybeGetEngineEvaluation as MaybeGetEngineEvaluation)?.(chess.fen);
		const winPercents =
			(commonMove && commonMove.winPercents) ||
			(!disableMostCommonMoves
				? (
						await getCommonMove({
							apiToken: auth?.token?.value,
							fen: chess.fen,
						})
					)?.winPercents
				: undefined);

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
		tryToEndGame();
	};

	function tryToEndGame() {
		if (choobHistory.length === 0) return;

		const lastMove = choobHistory[choobHistory.length - 1].findLast((entry) => !!entry) as ChoobHistoryEntry;
		if (lastMove.moveType !== 'player') return;

		const secondToLastMove =
			choobHistory.length <= 2
				? undefined
				: choobHistory[choobHistory.length - 1][1]
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
				endGame('Blunder');
			}
			return;
		}
		if (endOnDeviation && lastMove.studyDeviation) {
			endGame('Deviation');
			return;
		}
		if (endOnRarity && isPositionRareEnough) {
			endGame('Rarity');
			return;
		}
	}

	const endGame = async (reason: string) => {
		const lastMove = choobHistory[choobHistory.length - 1].findLast((entry) => !!entry) as ChoobHistoryEntry;
		if (!lastMove.winPercents) {
			lastMove.winPercents = (
				await getCommonMove({
					apiToken: auth?.token?.value,
					fen: chess.fen,
				})
			)?.winPercents;
		}
		reasonForEnd = reason;
		isGameOver = true;
	};
	maybeEndGame = endGame;

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

	let reasonForEnd = $state('');
</script>

<div class="gap-y-3 grid grid-rows-[1fr,1fr,1fr] w-full">
	<div class="flex lg:flex-row flex-col justify-around items-center gap-6 lex-wrap">
		<div class="flex flex-col items-center gap-2">
			<div class="flex flex-row xl:flex-col gap-x-3 gap-y-1">
				<div class="flex 2xl:flex-row flex-col items-center gap-x-3">
					<p>Game Status:</p>
					<p class="font-bold">{isGameOver ? 'Ended' : 'Active'}</p>
				</div>
				{#if isGameOver && reasonForEnd}
					<div class="flex 2xl:flex-row flex-col items-center gap-x-3">
						<p>Reason:</p>
						<p class="font-bold">{reasonForEnd}</p>
					</div>
				{/if}
			</div>
			<Button
				onclick={() => {
					isGameOver = !isGameOver;
					reasonForEnd = 'Stopped';
				}}
			>
				{isGameOver ? 'Start Game' : 'End Game'}
			</Button>
		</div>

		<div class="flex flex-col items-center gap-3">
			<p class="text-center">End Game on:</p>
			<div class="gap-x-3 gap-y-1 grid grid-cols-1 lg:grid-cols-2 grid-rows-4 lg:grid-rows-2 grid-flow-col">
				<div class="flex gap-3">
					<label class="flex items-center gap-2">
						Rare Position
						<Checkbox bind:checked={userEndOnRarity} disabled={disableMostCommonMoves} />
						{#if disableMostCommonMoves}
							<InfoTooltip title="Disabled because of the 'Disable Some Common Moves' option in API Settings" />
						{/if}
					</label>
					<label
						class={`${endOnRarity ? 'bg-(--background-gray)' : 'bg-(--disabled-color)/25 text-(--disabled-color)/75'} rounded-sm pr-1 pt-0.5`}
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
					<label class="flex items-center gap-2">Study Deviation<Checkbox bind:checked={endOnDeviation} /></label>
				</div>
				<div class="flex gap-3">
					<label class="flex items-center gap-2">Blunder<Checkbox bind:checked={endOnBlunder} /></label>
					<label
						class={`${endOnBlunder ? 'bg-(--background-gray)' : 'bg-(--disabled-color)/25 text-(--disabled-color)/75'} rounded-sm px-1 pt-0.5 pb-0.5`}
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
					<label class="flex items-center gap-2"
						>Allow Engine Punishment<Checkbox bind:checked={useEngineOnBlunder} disabled={!endOnBlunder} /></label
					>
				</div>
			</div>
		</div>
	</div>

	<div class="w-60 lg:w-full border-b-1 border-(--foreground-gray) justify-self-center"></div>

	<div class="flex justify-center items-center gap-3">
		<p>Show during game:</p>

		<div class="flex xl:flex-row flex-col flex-wrap gap-x-6">
			<label class="flex items-center gap-2">
				Win %<Checkbox bind:checked={recordWinPercent} />
			</label>

			<label class="flex items-center gap-2">
				Evaluation<Checkbox bind:checked={showEvaluation} />
			</label>

			<label class="flex items-center gap-2">
				Move Source<Checkbox bind:checked={showMoveSource} />
			</label>

			<label class="flex items-center gap-2">
				Study Deviations<Checkbox bind:checked={showStudyDeviations} />
			</label>
		</div>
	</div>

	<div class="flex flex-col items-center h-max overflow-x-scroll">
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
				{#if choobHistory.length > 0}
					{#each choobHistory as entry, i (entry)}
						<tr class="*:text-center">
							<td>{i + 1}.</td>
							<td>{entry[0].san}</td>
							{#if showStudyDeviations}
								<td>{entry[0].studyDeviation ?? '-'}</td>
							{/if}
							{#if showEvaluation || isGameOver}
								<td class={`${entry[0].evalSource === 'local' ? 'text-(--foreground)/60' : ''}`}
									>{entry[0].centipawns}</td
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
				{/if}
			</tbody>
		</table>
		{#if choobHistory.length === 0}
			<div class="text-center">-</div>
		{/if}
	</div>
	<div class="flex justify-center">
		<Button
			onclick={() => window.open(`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`, '_blank')}
		>
			Lichess Button
		</Button>
	</div>
</div>
