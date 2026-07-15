<script module lang='ts'>
	/**
	 * Svelte cannot track the mutations made by functions like `Chess.move`. So, wrap everything we intend to call/access :(
	 */
	export class SvelteChess {
		chess = new Chess();
		// These should be read-only but then i'd need to write getters and setters :( just dont break the rules ok
		fen = $state(this.chess.fen());
		turn = $state(this.chess.turn());
		history = $state(this.chess.history());

		constructor(fen?: string) {
			this.chess = new Chess(fen || undefined); // don't take empty string
			this.fen = this.chess.fen();
			this.turn = this.chess.turn();
			this.history = this.chess.history();
		}

		/**
		 * This is what tells Svelte we've done something. Not calling it after making a change won't
		 * lose the change, it just won't tell Svelte until it is called.
		 */
		updateSnapshot() {
			this.fen = this.chess.fen();
			this.turn = this.chess.turn();
			this.history = this.chess.history();
		}

		move(move: Parameters<Chess['move']>[0]) {
			this.chess.move(move);
			this.updateSnapshot();
		}

		historyVerbose(): Move[] {
			return this.chess.history({ verbose: true });
		}

		reset() {
			this.chess.reset();
			this.updateSnapshot();
		}
	}

	export type onMoveHandler = (from: Key, to: Key) => void
</script>

<script lang="ts">
	import { Chessground } from 'chessground';
	import { type Key } from 'svelte5-chessground';
	import { Chess } from 'chess.js';
	import type { Color, Move } from 'chess.js';
	import 'svelte5-chessground/style.css';
	import { SvelteMap } from 'svelte/reactivity';

	let {
		chess,
		playerColor,
		playChoobMove,
		recordMove,
	}: {
		chess: SvelteChess;
		playerColor: Color;
		playChoobMove: (() => void) | null
		recordMove: onMoveHandler
	} = $props();

	let boardEl: HTMLElement;
	let api: ReturnType<typeof Chessground>;

	const turnColor = () => (chess.chess.turn() === 'w' ? 'white' : 'black');
	function getDestinations(): Map<Key, Key[]> {
		const destinationLists = new SvelteMap<Key, Key[]>();
		for (const move of chess.chess.history({ verbose: true })) {
			const from = move.from;
			let destinationsFromSquare = destinationLists.get(from);
			if (!destinationsFromSquare) {
				destinationLists.set(from, []);
				destinationsFromSquare = destinationLists.get(from)!;
			}
			destinationsFromSquare.push(move.to);
		}
		return destinationLists;
	}

	const isPlayersTurn = () => (playerColor === 'w' ? 'white' : 'black' === turnColor());
	$effect(() => {
		const history = chess.historyVerbose();
		const lastMove = history && history[chess.history.length - 1];
		// https://github.com/lichess-org/chessground/blob/master/src/config.ts
		api = Chessground(boardEl, {
			fen: chess.fen,
			turnColor: turnColor(),
			orientation: playerColor === 'w' ? 'white' : 'black',
			check: chess.chess.isCheck(),
			lastMove: lastMove && [lastMove.from, lastMove.to],
			highlight: {
				lastMove: true,
				check: true,
			},
			movable: {
				free: false,
				color: isPlayersTurn() ? turnColor() : undefined,
				dests: getDestinations(),
				showDests: true,
				events: {
					after: async (from, to) => {
						chess.chess.move({ from, to });

						api.set({
							fen: chess.chess.fen(),
							turnColor: turnColor(),
							lastMove: [from, to],
							movable: { color: isPlayersTurn() ? turnColor() : undefined, dests: getDestinations() },
							check: chess.chess.isCheck(),
						});
						chess.updateSnapshot();

						recordMove(from, to)
						playChoobMove?.()
					},
				},
			},
		});
		return () => api.destroy();
	});
</script>

<div class="container" bind:this={boardEl}></div>

<style>
	.container {
		width: 512px;
		height: 512px;
	}
	:global square.last-move {
		background-color: rgba(155, 199, 0, 0.41);
	}
	:global square.check {
		background-color: rgba(20, 85, 30, 0.5);
	}
</style>
