<script module lang="ts">
    export type StudyValidity = 'valid' | 'invalid' | 'loading';
</script>

<script lang="ts">

    import { getStudyGames } from '$lib/chess/getStudyMove';
	import { authToken } from '$lib/login.svelte';
    
	let {
		studyId = $bindable(),
		studyIsPublic = $bindable(),
        studyValidity = $bindable()
	}: { studyId: string; studyIsPublic: boolean; studyValidity: StudyValidity } = $props();

	function validateStudyId(idToValidate: string, isPublic: boolean) {
		studyValidity = 'loading';
		getStudyGames(idToValidate, isPublic, authToken?.token?.value).then((games) => {
            if (games?.length) {
                studyValidity = 'valid';
            } else {
                studyValidity = 'invalid';
            }
        })
	}

    $effect(() => void validateStudyId(studyId, studyIsPublic));
</script>

<div>
	Study ID: <input bind:value={studyId} placeholder="Input study Id..." class="w-24"/>
	Study is public? <input type="checkbox" bind:checked={studyIsPublic} />
	<button onclick={() => {
        const games = getStudyGames(studyId, studyIsPublic, authToken?.token?.value)
		window.localStorage.setItem(studyId, JSON.stringify(games))
    }}>Save current study</button>
	{studyValidity}
</div>
