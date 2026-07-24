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
	import RadioInput from './ui/RadioInput.svelte';
	import NumberInput from './ui/NumberInput.svelte';
	import type { StudyValidity } from './StudyValidator.svelte';

	let { studyId, studyValidity, setBoard }: { studyId: string; studyValidity: StudyValidity, setBoard: (fen?: string) => void } = $props();

	let chapters: IncompleteStudyChapter[] = $state([]);

	let selectedIncompleteChapter: IncompleteStudyChapter | null = $state(null);
	function setSelectedIncompleteChapter(v: IncompleteStudyChapter | null) {
		selectedIncompleteChapter = v;
		handleChapterSelect();
	}
	let whereToPlayChapterFrom: 'start' | 'end' | 'custom' = $state('start');
	function setWhereToPlayChapterFrom(v: 'start' | 'end' | 'custom') {
		whereToPlayChapterFrom = v;
		handleChapterSelect();
	}
	let moveNumberToPlayChapterFrom = $state(0);

	let selectedChapter = $state<StudyChapter>();

	$effect(() => {
		const updateChapters = async () => {
			if (!studyId) return;
			if (studyValidity !== 'valid') chapters = [];

			const study = await getStudyGames(studyId, false, auth?.token?.value);
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

	function handleChapterSelect() {
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

		if (fenToPlayFrom) setBoard(fenToPlayFrom);
	}
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
				<RadioInput
					id={name}
					name="chapterSelect"
					bind:selected={() => selectedIncompleteChapter, setSelectedIncompleteChapter}
					value={chapter}
				/>
				<label for={name}>{name}</label>
			</div>
			{/each}
		</div>
	<div class="w-full border-b-1 border-(--foreground-gray)"></div>
	<div class="flex flex-col *:flex *:gap-3 *:items-center">
		<label
			><RadioInput
				bind:selected={() => whereToPlayChapterFrom, setWhereToPlayChapterFrom}
				value="start"
				name="fenSide"
			/>Use Start</label
		>
		<label
			><RadioInput
				bind:selected={() => whereToPlayChapterFrom, setWhereToPlayChapterFrom}
				value="end"
				name="fenSide"
			/>Use End</label
		>
		<div class="*:flex *:gap-3 *:items-center">
			<label>
				<RadioInput
					bind:selected={() => whereToPlayChapterFrom, setWhereToPlayChapterFrom}
					value="custom"
					name="fenSide"
				/>
				Use Move Number</label
				>
			<NumberInput
				bind:value={moveNumberToPlayChapterFrom}
				disabled={whereToPlayChapterFrom !== 'custom'}
				class="max-w-12"
				onchange={handleChapterSelect}
				spinner
			/>
		</div>
	</div>
</div>