<script module lang="ts">
	export type StudyValidity = 'valid' | 'invalid' | 'loading';
</script>

<script lang="ts">
	import { getStudyGames } from '$lib/chess/getStudyMove';
	import { auth } from '$lib/login.svelte';
	import { onMount } from 'svelte';
	import Button from './ui/Button.svelte';
	import TextInput from './ui/TextInput.svelte';

	let {
		studyId = $bindable(),
		studyIsPublic = $bindable(),
		studyValidity = $bindable(),
	}: { studyId: string; studyIsPublic: boolean; studyValidity: StudyValidity } = $props();

	function validateStudyId(idToValidate: string, isPublic: boolean) {
		if (idToValidate.length !== 8) {
			studyValidity = 'invalid';
			return;
		}

		studyValidity = 'loading';
		getStudyGames(idToValidate, isPublic, auth?.token?.value).then((games) => {
			if (games?.length) {
				studyValidity = 'valid';
			} else {
				studyValidity = 'invalid';
			}
		});
	}

	$effect(() => void validateStudyId(studyId, studyIsPublic));

	onMount(() => {
		const savedStudyId = window.localStorage.getItem('studyId');
		if (savedStudyId) studyId = savedStudyId;
	});

	$effect(() => {
		window.localStorage.setItem('studyId', studyId);
	});
</script>

<div class="flex gap-x-6 flex-wrap">
	<div class='flex gap-3 items-center'>
		<p>Study ID:</p>
		<TextInput bind:value={studyId} placeholder="Study ID..."/>
		<p class="w-12">
			{studyValidity}
		</p>
	</div>

	<div class="flex gap-3 items-center">
		<Button
			class="btn"
			disabled={studyValidity !== 'valid'}
			onclick={async () => {
				const games = await getStudyGames(studyId, studyIsPublic, auth?.token?.value, false);
				if (games) window.localStorage.setItem(studyId, JSON.stringify(games));
			}}>Save current study</Button
		>
		<Button
			class="btn"
			disabled={studyValidity !== 'valid'}
			onclick={() => window.open(`https://lichess.org/study/${studyId}`, '_blank')}>Open Study in Lichess</Button
		>
	</div>
</div>
