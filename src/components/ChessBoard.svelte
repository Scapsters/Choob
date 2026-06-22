<script lang="ts">
	import { Chessground } from 'chessground';
	import { type Key } from 'svelte5-chessground';
	import type { Chess } from 'chess.js';
	import 'svelte5-chessground/style.css';
	import { SvelteMap } from 'svelte/reactivity';

	let { chess }: { chess: Chess } = $props();

	let boardEl: HTMLElement;
	let api: ReturnType<typeof Chessground>;

	const turnColor = () => (chess.turn() === 'w' ? 'white' : 'black');
	function getDestinations(): Map<Key, Key[]> {
		const destinationLists = new SvelteMap<Key, Key[]>();
		for (const move of chess.moves({ verbose: true })) {
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
			fen: chess.fen(),
			turnColor: turnColor(),
			movable: {
				free: false,
				color: turnColor(),
				dests: getDestinations(),
				showDests: true,
				events: {
					after: (from, to) => {
						chess.move({ from, to });
						api.set({
							fen: chess.fen(),
							turnColor: turnColor(),
							lastMove: [from, to],
							movable: { color: turnColor(), dests: getDestinations() },
							check: chess.isCheck()
						});
					}
				}
			}
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
</style>
