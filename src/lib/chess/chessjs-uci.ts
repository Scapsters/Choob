import { SvelteChess } from '../../components/ChessBoard.svelte';
import type { Move } from 'chess.js';

/**
 * Given a SvelteChess, return its history in UCI
 * Basically a wrapper on .history({ verbose: true })
 * @param chess the SvelteChess object to extract history from
 */
export function getUCIHistory(chess: SvelteChess): string {
	return (chess.historyVerbose() as Move[]).map((move) => move.from + move.to + (move.promotion || '')).join(',');
}
