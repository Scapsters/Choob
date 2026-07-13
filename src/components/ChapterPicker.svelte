<script module lang="ts">
	export type StudyChapter = {
		name: string;
		fen: string;
	};
</script>

<script lang="ts">
	import { DEFAULT_FEN, getStudyGames, type StudyGameTags } from '$lib/chess/getStudyMove';
	import { authToken } from '$lib/login.svelte';

	let { studyId, selectedChapter = $bindable() }: { studyId: string; selectedChapter?: StudyChapter } =
		$props();

	let chapters: StudyChapter[] = $state([]);

	$effect(() => {
		const updateChapters = async () => {
			if (!studyId || !authToken.token) return;

			const study = await getStudyGames(studyId, false, authToken.token.value);
			chapters =
				study?.map((chapter) => {
					const name = (chapter.tags as StudyGameTags)?.['ChapterName'];
					const fen = chapter.tags?.FEN ?? DEFAULT_FEN;
					if (!name || !fen)
						throw new Error(`studyId ${studyId} was missing name or fen: ${name}, ${fen}`);
					return { name, fen };
				}) || [];
		};
		updateChapters();
	});
</script>

<div>
	<p>Select Study Chapter</p>
	<div class="p-1 h-28 w-70 overflow-y-scroll">
		{#each chapters as chapter (chapter)}
            {const name = chapter.name}
            <div>
                <input id={name} name="chapterSelect" type="radio" bind:group={selectedChapter} value={chapter} />
                <label for={name}>{name}</label>
            </div>
		{/each}
	</div>
</div>
