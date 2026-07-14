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
	import { authToken } from '$lib/login.svelte';
	import type { ParseTree } from '@mliebelt/pgn-parser';
	import { Chess } from 'chess.js';

	let { studyId, selectedChapter = $bindable() }: { studyId: string; selectedChapter?: StudyChapter } = $props();

	let chapters: IncompleteStudyChapter[] = $state([]);

	let selectedIncompleteChapter: IncompleteStudyChapter | null = $state(null);
	let whereToPlayChapterFrom: 'start' | 'end' = $state('start');

	$effect(() => {
		const updateChapters = async () => {
			if (!studyId || !authToken.token) return;

			const study = await getStudyGames(studyId, false, authToken.token.value);
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

		const endOfChapter = new Chess(startingFen);
		selectedIncompleteChapter.pgn.forEach((move) => {
			endOfChapter.move(move.notation.notation);
		});

		const fenToPlayFrom = whereToPlayChapterFrom === 'start' ? startingFen : endOfChapter.fen();
		selectedChapter = { ...selectedIncompleteChapter, fenToPlayFrom };
	});
</script>

<div>
	<div>
		<p>Select Study Chapter for Starting FEN</p>
		<label for="start">Use Start</label><input
			bind:group={whereToPlayChapterFrom}
			id="start"
			value="start"
			type="radio"
			name="fenSide"
		/>
		<label for="end">Use End</label><input
			bind:group={whereToPlayChapterFrom}
			id="end"
			value="end"
			type="radio"
			name="fenSide"
		/>
	</div>
	<div class="p-1 h-28 w-70 overflow-y-scroll">
		{#each chapters as chapter (chapter)}
			{const name = chapter.name}
			<div>
				<input id={name} name="chapterSelect" type="radio" bind:group={selectedIncompleteChapter} value={chapter} />
				<label for={name}>{name}</label>
			</div>
		{/each}
	</div>
</div>
