<script lang="ts">
	import { getStudyGames, prepareStudy, type MoveNodeWithFEN, type StudyGameTags } from '$lib/chess/getStudyMove';
	import { auth } from '$lib/login.svelte';
	import type { ParseTree } from '@mliebelt/pgn-parser';
	import Button from './ui/Button.svelte';
	import TextInput from './ui/TextInput.svelte';
	import type { SvelteChess } from './ChessBoard.svelte';

	let { studyId, setBoard, chess }: { studyId: string; setBoard: (fen?: string) => void; chess: SvelteChess } =
		$props();

	let moveToSearch = $state('');
	type FoundChapterWithMove = ParseTree & { matchingMove: MoveNodeWithFEN; moveBefore?: MoveNodeWithFEN };
	let foundChaptersWithMove: FoundChapterWithMove[] = $state([]);

	$effect(() => {
		async function searchForMoveInStudy(move: string) {
			if (!moveToSearch || !auth.token) return;

			const chapters = await getStudyGames(studyId, false, auth.token.value);
			if (!chapters) return;

			const chaptersWithMoveTrees = chapters.map((chapter) => ({
				...chapter,
				moveTreesWithFen: prepareStudy([chapter])['moveTreesWithFEN'],
			}));

			/**
			 * Traverses the given tree, calling filter at each node.
			 * @param search the current search. When calling, pass a single element array.
			 * @param filter given a node, return a response or nothing.
			 * @returns the first non-nothing value returned from `filter`
			 */
			function searchTree(
				search: MoveNodeWithFEN[],
				filter: (node: MoveNodeWithFEN) => MoveNodeWithFEN | undefined
			): MoveNodeWithFEN[] | undefined {
				const currentNode = search[search.length - 1];

				const result = filter(currentNode);
				if (result) return search;

				for (const branch of currentNode.branches) {
					const result = searchTree([...search, branch], filter);
					if (result) return result;
				}
			}

			const chaptersWithMove: FoundChapterWithMove[] = [];
			chaptersWithMoveTrees.forEach((chapter) => {
				const matchingMoveSearch = searchTree([chapter.moveTreesWithFen[0]], (node) => {
					if (node.notation.notation === move) return node;
				});
				if (!matchingMoveSearch) return;

				const matchingMove = matchingMoveSearch[matchingMoveSearch.length - 1];
				const moveBefore = matchingMoveSearch[matchingMoveSearch.length - 2];
				chaptersWithMove.push({ ...chapter, moveBefore, matchingMove });
			});

			foundChaptersWithMove = chaptersWithMove;
		}
		if (moveToSearch) searchForMoveInStudy(moveToSearch);
	});
</script>

<div>
	<div class="flex gap-3 items-center">
		<label for="moveSearch">Search for move in study:</label>
		<TextInput id="moveSearch" class="w-20" bind:value={moveToSearch} />
		<Button
			disabled={chess.history.length === 0}
			onclick={() => {
				const history = chess.historyVerbose();
				if (history.length === 0) return;
				moveToSearch = history[history.length - 1].san;
			}}>Search last move</Button
		>
	</div>
	{#if foundChaptersWithMove}
		<div class="w-full flex flex-col gap-1 text-left overflow-y-scroll items-start">
			{#each foundChaptersWithMove as chapter (chapter)}
				{@const name = (chapter.tags as StudyGameTags)?.['ChapterName']}
				<Button class="w-full text-left" onclick={() => setBoard(chapter.moveBefore?.fen ?? chapter.tags?.FEN)}
					>{name}</Button
				>
			{/each}
		</div>
	{/if}
</div>
