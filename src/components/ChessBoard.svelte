<script lang="ts">
	import { Chessground } from 'chessground';
	import { type Key } from 'svelte5-chessground';
	import { Chess } from 'chess.js';
	import 'svelte5-chessground/style.css';
	import { SvelteMap } from 'svelte/reactivity';

	let { chess }: { chess: SvelteChess } = $props();

	let boardEl: HTMLElement;
	let api: ReturnType<typeof Chessground>;

	const turnColor = () => (chess.chess.turn() === 'w' ? 'white' : 'black');
	function getDestinations(): Map<Key, Key[]> {
		const destinationLists = new SvelteMap<Key, Key[]>();
		for (const move of chess.chess.moves({ verbose: true })) {
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

	$effect(() => {
		// https://github.com/lichess-org/chessground/blob/master/src/config.ts
		api = Chessground(boardEl, {
			fen: chess.fen,
			turnColor: turnColor(),
			movable: {
				free: false,
				color: turnColor(),
				dests: getDestinations(),
				showDests: true,
				events: {
					after: (from, to) => {
						chess.chess.move({ from, to });
						api.set({
							fen: chess.chess.fen(),
							turnColor: turnColor(),
							lastMove: [from, to],
							movable: { color: turnColor(), dests: getDestinations() },
							check: chess.chess.isCheck()
						});
						chess.updateSnapshot()
					}
				}
			}
		});
		return () => api.destroy();
	});
</script>

<script module>
	/**
	 * Svelte cannot track the mutations made by functions like `Chess.move`. So, wrap everything we intend to call/access ):
	 */
	export class SvelteChess {
		chess = new Chess()
		// These should be read-only but then i'd need to write getters and setters ): just dont break the rules ok
		fen = $state(this.chess.fen())
		turn = $state(this.chess.turn())
		history = $state(this.chess.history())

		/**
		 * This is what tells Svelte we've done something. Not calling it after making a change won't
		 * lose the change, it just won't tell Svelte until it is called.
		 */
		updateSnapshot() {
			this.fen = this.chess.fen()
			this.turn = this.chess.turn()
			this.history = this.chess.history()
		}

		move(move: Parameters<Chess['move']>[0]) {
			this.chess.move(move)
			this.updateSnapshot()
		}
	}
</script>

<div class="container" bind:this={boardEl}></div>

<style>
	.container {
		width: 512px;
		height: 512px;
	}
</style>
