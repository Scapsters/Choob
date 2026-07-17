<script module lang="ts">
	type IncompleteStudyChapter = {
		name: string;
		startingFen: string;
		pgn: ParseTree['moves'];
	};
	export type StudyChapter = IncompleteStudyChapter & {
		fenToPlayFrom: string;
	};
</script>

<script lang="ts">
	import { DEFAULT_FEN, getStudyGames, type StudyGameTags } from '$lib/chess/getStudyMove';
	import { auth } from '$lib/login.svelte';
	import type { ParseTree } from '@mliebelt/pgn-parser';
	import { Chess } from 'chess.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import RadioInput from './ui/RadioInput.svelte';
	import NumberInput from './ui/NumberInput.svelte';

	let {
		studyId,
		selectedChapter = $bindable(),
		...rest
	}: { studyId: string; selectedChapter?: StudyChapter } & HTMLAttributes<HTMLDivElement> = $props();

	let chapters: IncompleteStudyChapter[] = $state([]);

	let selectedIncompleteChapter: IncompleteStudyChapter | null = $state(null);
	let whereToPlayChapterFrom: 'start' | 'end' | 'custom' = $state('start');
	let moveNumberToPlayChapterFrom = $state(0);

	$effect(() => {
		const updateChapters = async () => {
			if (!studyId || !auth.token) return;

			const study = await getStudyGames(studyId, false, auth.token.value);
			chapters =
				study?.map((chapter) => {
					const name = (chapter.tags as StudyGameTags)?.['ChapterName'];
					const startingFen = chapter.tags?.FEN ?? DEFAULT_FEN;
					if (!name || !startingFen)
						throw new Error(`studyId ${studyId} was missing name or fen: ${name}, ${startingFen}`);
					return { name, startingFen, pgn: chapter.moves };
				}) || [];
		};
		updateChapters();
	});

	$effect(() => {
		if (!selectedIncompleteChapter) return;

		const startingFen = selectedIncompleteChapter.startingFen;

		let fenToPlayFrom: string = startingFen;
		switch (whereToPlayChapterFrom) {
			case 'start':
				fenToPlayFrom = startingFen;
				break;
			case 'end':
				const endOfChapter = new Chess(startingFen);
				selectedIncompleteChapter.pgn.forEach((move) => {
					endOfChapter.move(move.notation.notation);
				});
				fenToPlayFrom = endOfChapter.fen();
				break;
			case 'custom':
			default:
				const customMove = new Chess(startingFen);
				selectedIncompleteChapter.pgn.forEach((move, i) => {
					if (i >= moveNumberToPlayChapterFrom) return;
					customMove.move(move.notation.notation);
				});
				fenToPlayFrom = customMove.fen();
		}

		selectedChapter = { ...selectedIncompleteChapter, fenToPlayFrom };
	});
</script>

<div class="flex flex-col gap-1">
	<div>
		<p>Select Study Chapter for Starting FEN</p>
	</div>
	<div class="w-full border-b-1 border-(--foreground-gray)"></div>
	<div class="p-1 h-full w-full overflow-y-scroll">
		{#each chapters as chapter (chapter)}
			{const name = chapter.name}
			<div class="flex gap-3 items-center">
				<RadioInput id={name} name="chapterSelect" bind:group={selectedIncompleteChapter} value={chapter} />
				<label for={name}>{name}</label>
			</div>
		{/each}
	</div>
	<div class="w-full border-b-1 border-(--foreground-gray)"></div>
	<div class="flex flex-col *:flex *:gap-3 *:items-center">
		<label><RadioInput bind:group={whereToPlayChapterFrom} value="start" name="fenSide" />Use Start</label>
		<label><RadioInput bind:group={whereToPlayChapterFrom} value="end" name="fenSide" />Use End</label>
		<div class="*:flex *:gap-3 *:items-center">
			<label>
				<RadioInput bind:group={whereToPlayChapterFrom} value="custom" name="fenSide" />
				Use Move Number</label
			>
			<NumberInput
				bind:value={moveNumberToPlayChapterFrom}
				disabled={whereToPlayChapterFrom !== 'custom'}
				class="max-w-12"
				spinner
			/>
		</div>
	</div>
</div>
