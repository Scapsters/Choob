<script module lang="ts">
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

		isCheck() {
			return this.chess.isCheck();
		}

		loadPgn(pgn: Parameters<Chess['loadPgn']>[0]) {
			this.chess.loadPgn(pgn);
			this.updateSnapshot();
			return this;
		}

		setBoard(fen: string) {
			this.chess = new Chess(fen);
			this.updateSnapshot();
		}
	}

	export type onMoveHandler = (from: Key, to: Key) => void;
</script>

<script lang="ts">
	import { Chessground } from 'chessground';
	import { type Config, type Key } from 'svelte5-chessground';
	import { Chess } from 'chess.js';
	import type { Color, Move } from 'chess.js';
	import 'svelte5-chessground/style.css';
	import type { RecordMove } from './GameHistory.svelte';
	import { onMount } from 'svelte';

	let {
		chess,
		playerColor,
		isChoobEnabled,
		playChoobveIfPossible,
		recordMove,
	}: {
		chess: SvelteChess;
		playerColor?: Color;
		isChoobEnabled: boolean;
		playChoobveIfPossible: () => void;
		recordMove: RecordMove;
	} = $props();

	let boardEl: HTMLElement;
	let api: ReturnType<typeof Chessground>;

	function getDestinations(chess: SvelteChess): Map<Key, Key[]> {
		// Calling get marks the map as a dependency in the effect this function
		// is called in, and then setting the map alters the dependency.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const destinationLists = new Map<Key, Key[]>();
		for (const move of chess.chess.moves({ verbose: true })) {
			const from = move.from;

			let destinationsFromSquare = destinationLists.get(from);
			if (!destinationsFromSquare) destinationLists.set(from, []);

			destinationsFromSquare = destinationLists.get(from)!;
			destinationsFromSquare.push(move.to);
		}
		return destinationLists;
	}

	const convertColor = (color: Color) => (color === 'w' ? 'white' : 'black');
	function getConfigFromChess(chess: SvelteChess): Config {
		const history = chess.historyVerbose();
		const lastMove = history && history[history.length - 1];
		return {
			fen: chess.fen,
			turnColor: convertColor(chess.turn),
			orientation: convertColor(playerColor ?? 'w'),
			check: chess.isCheck(),
			lastMove: lastMove && [lastMove.from, lastMove.to],
			movable: {
				color:
					(playerColor && convertColor(playerColor) === convertColor(chess.turn)) || !isChoobEnabled
						? convertColor(chess.turn)
						: undefined,
				dests: getDestinations(chess),
			},
		};
	}

	onMount(() => {
		const config = getConfigFromChess(chess);
		// https://github.com/lichess-org/chessground/blob/master/src/config.ts
		api = Chessground(boardEl, {
			...config,
			highlight: {
				lastMove: true,
				check: true,
			},
			animation: {
				enabled: true,
				duration: 500,
			},
			movable: {
				...config.movable,
				free: false,
				showDests: true,
				events: {
					after: async (from, to) => {
						chess.move({ from, to });
						chess.updateSnapshot();
						recordMove?.(chess, 'player').then(playChoobveIfPossible);
					},
				},
			},
		});
		return () => api.destroy();
	});

	$effect(() => {
		api.set(getConfigFromChess(chess));
	});
</script>

<div class="w-full h-full rounded-lg">
	<div class="w-full aspect-square rounded-lg board" bind:this={boardEl}></div>
</div>

<style>
	:global square.last-move {
		background-color: rgba(155, 199, 0, 0.41);
	}
	:global square.check {
		background-color: rgba(20, 85, 30, 0.5);
	}
</style>
