<script module lang="ts">
	export type RecordMove = ((chess: SvelteChess, source: MoveType) => Promise<void>) | null;
</script>

<script lang="ts">
	import { getCommonMove } from '$lib/chess/getCommonMove';
	import { authToken } from '$lib/login.svelte';
	import type { Color } from 'chess.js';
	import type { MoveType } from './Choobser.svelte';
	import type { ChoobHistory, ChoobHistoryEntry, MaybeGetEngineEvaluation } from '../routes/+page.svelte';
	import type { SvelteChess } from './ChessBoard.svelte';

	let {
		getEngineEvaluation,
		recordMove = $bindable(),
		resetHistory = $bindable(),
	}: {
		getEngineEvaluation: MaybeGetEngineEvaluation;
		recordMove: RecordMove;
		resetHistory: (() => void) | null;
	} = $props();

	let choobHistory = $state<ChoobHistory>([]);

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
	recordMove = async function (chess: SvelteChess, moveType: MoveType) {
		const history = chess.chess.history();
		const evaluation = (getEngineEvaluation as MaybeGetEngineEvaluation)?.(chess.fen);
		const common = getCommonMove({
			apiToken: authToken?.token?.value,
			fen: chess.fen,
		});
		addEntryToHistory(chess.chess.turn() === 'w' ? 'b' : 'w', {
			...(await evaluation),
			san: history[history.length - 1],
			moveType,
			winPercents: (await common)?.winPercents,
		});
	};

	resetHistory = async function () {
		choobHistory = [];
	};
</script>

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
				<td>{entry[0].moveType}</td>
				<td>{Math.round((entry[0].winPercents?.white ?? 0) * 100) || '-'}</td>
				<td>{entry[1]?.san ?? '-'}</td>
				<td>{entry[1]?.centipawns ?? '-'}</td>
				<td>{entry[1]?.moveType ?? '-'}</td>
				<td>{Math.round((entry[1]?.winPercents?.white ?? 0) * 100) || '-'}</td>
			</tr>
		{/each}
	</tbody>
</table>
