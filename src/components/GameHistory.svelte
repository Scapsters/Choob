<script module lang="ts">
	export type ChoobHistory = [ChoobHistoryEntry, ChoobHistoryEntry | null][];
	export type ChoobHistoryEntry = Partial<ChoobEvaluation> & {
		san: string;
		moveType: MoveType;
		winPercents?: ChoobCommonMove['winPercents'];
		studyDeviation?: string;
	};

	export type RecordMove = ((chess: SvelteChess, source: MoveType, studyDeviation?: string) => Promise<void>) | null;
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

	let {
		maybeGetEngineEvaluation,
		recordMove = $bindable(),
		choobHistory = $bindable(),
		chess,
	}: {
		maybeGetEngineEvaluation: MaybeGetEngineEvaluation;
		recordMove: RecordMove;
		choobHistory: ChoobHistory;
		chess: SvelteChess;
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
	recordMove = async function (chess: SvelteChess, moveType: MoveType, studyDeviation?: string) {
		const history = chess.chess.history();
		const evaluation = (maybeGetEngineEvaluation as MaybeGetEngineEvaluation)?.(chess.fen);
		const winPercents = recordWinPercent
			? (
					await getCommonMove({
						apiToken: auth?.token?.value,
						fen: chess.fen,
					})
				)?.winPercents
			: undefined;
		addEntryToHistory(chess.chess.turn() === 'w' ? 'b' : 'w', {
			...(await evaluation),
			san: history[history.length - 1],
			moveType,
			winPercents,
			studyDeviation: recordStudyDeviations ? studyDeviation : undefined,
		});
	};

	let recordWinPercent = $state(false);
	let recordStudyDeviations = $state(true);
</script>

<div class="grid grid-rows-[1fr,1fr] gap-y-3">
	<div class="flex justify-between items-center gap-3">
		<Button
			onclick={() => window.open(`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`, '_blank')}
		>
			Lichess Button
		</Button>

		<div class="flex gap-3">
			<label class="flex gap-3 items-center">
				Always Record Win Percent
				<Checkbox bind:checked={recordWinPercent} />
			</label>

			<label class="flex gap-3 items-center">
				Note Study Deviations
				<Checkbox bind:checked={recordStudyDeviations} />
			</label>
		</div>
	</div>

	<div class="h-100 flex flex-col items-center">
		<table>
			<thead>
				<tr class="*:px-3">
					<td>Move</td>
					{#if recordStudyDeviations}
						<td>Deviation</td>
					{/if}
					<td>Eval</td>
					<td>Source</td>
					{#if recordWinPercent}
						<td>Win% (W)</td>
					{/if}
					<td>Move</td>
					{#if recordStudyDeviations}
						<td>Deviation</td>
					{/if}
					<td>Eval</td>
					<td>Source</td>
					{#if recordWinPercent}
						<td>Win% (W)</td>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each choobHistory as entry (entry)}
					<tr class="*:text-center">
						<td>{entry[0].san}</td>
						{#if recordStudyDeviations}
							<td>{entry[0].studyDeviation ?? '-'}</td>
						{/if}
						<td class={`${entry[0].evalSource === 'local' ? 'text-(--foreground)/60' : ''}`}>{entry[0].centipawns}</td>
						<td>{entry[0].moveType}</td>
						{#if recordWinPercent}
							<td>{Math.round((entry[0].winPercents?.white ?? 0) * 100) || '-'}</td>
						{/if}

						<td>{entry[1]?.san ?? '-'}</td>
						{#if recordStudyDeviations}
							<td>{entry[1]?.studyDeviation ?? '-'}</td>
						{/if}
						<td class={`${entry[1]?.evalSource === 'local' ? 'text-(--foreground)/60' : ''}`}
							>{entry[1]?.centipawns ?? '-'}</td
						>
						<td>{entry[1]?.moveType ?? '-'}</td>
						{#if recordWinPercent}
							<td>{Math.round((entry[1]?.winPercents?.white ?? 0) * 100) || '-'}</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
