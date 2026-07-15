<script lang="ts">
	import { getStudyGames, prepareStudy, type MoveNodeWithFEN, type StudyGameTags } from '$lib/chess/getStudyMove';
	import { authToken } from '$lib/login.svelte';
	import type { ParseTree } from '@mliebelt/pgn-parser';

	let { studyId, resetBoard }: { studyId: string; resetBoard: (fen?: string) => void } = $props();

	let moveToSearch = $state('');
	type FoundChapterWithMove = ParseTree & { matchingMove: MoveNodeWithFEN; moveBefore?: MoveNodeWithFEN };
	let foundChaptersWithMove: FoundChapterWithMove[] = $state([]);

	$effect(() => {
		async function searchForMoveInStudy(move: string) {
			if (!moveToSearch || !authToken.token) return;

			const chapters = await getStudyGames(studyId, false, authToken.token.value);
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

<label for="moveSearch" class="pr-1">Search for move in study:</label><input
	id="moveSearch"
	type="text"
	bind:value={moveToSearch}
/>
<div class="h-30 w-80 flex flex-col gap-1 text-left overflow-y-scroll items-start">
	{#each foundChaptersWithMove as chapter (chapter)}
		{@const name = (chapter.tags as StudyGameTags)?.['ChapterName']}
		<button
			class="w-full text-left"
			onclick={() => resetBoard(chapter.matchingMove?.fen ?? chapter.tags?.FEN)}>{name}</button
		>
	{/each}
</div>
