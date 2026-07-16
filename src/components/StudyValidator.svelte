<script module lang="ts">
	export type StudyValidity = 'valid' | 'invalid' | 'loading';
</script>

<script lang="ts">
	import { getStudyGames } from '$lib/chess/getStudyMove';
	import { auth } from '$lib/login.svelte';
	import { onMount } from 'svelte';
	import Button from './ui/Button.svelte';

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

<div>
	Study ID: <input bind:value={studyId} placeholder="Input study Id..." class="w-24" />
	Study is public? <input type="checkbox" bind:checked={studyIsPublic} />
	<Button
		disabled={studyValidity !== 'valid'}
		onclick={async () => {
			const games = await getStudyGames(studyId, studyIsPublic, auth?.token?.value, false);
			if (games) window.localStorage.setItem(studyId, JSON.stringify(games));
		}}>Save current study</Button
	>
	{studyValidity}
</div>
