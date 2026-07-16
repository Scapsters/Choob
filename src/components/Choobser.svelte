<script module lang="ts">
	export type MoveType = 'study' | 'common' | 'engine (C)' | 'engine (L)' | 'player';
	export type MoveWeight = {
		type: MoveType;
		weight: number;
	};
	export type ChessMove = Parameters<Chess['move']>[0];
</script>

<script lang="ts">
	import { getCloudEvaluation, type ChoobEvaluation } from '$lib/chess/getCloudEvaluation.js';
	import { getCommonMove } from '$lib/chess/getCommonMove.js';
	import { getLocalEvaluation } from '../lib/chess/getLocalEvaluation.ts';
	import Chooser from '$lib/external-packages/Chooser.js';

	import { authToken } from '../lib/login.svelte.ts';
	import type { StudyValidity } from './StudyValidator.svelte';
	import { getStudyMove } from '$lib/chess/getStudyMove.js';
	import type { SvelteChess } from './ChessBoard.svelte';
	import type { Chess } from 'chess.js';
	import type { RecordMove } from './GameHistory.svelte';

	let {
		studyId,
		studyValidity,
		studyIsPublic,
		chess,
		recordMove,
		isChoobEnabled = $bindable(),
		playChoobve = $bindable(),
	}: {
		studyId: string;
		studyValidity: StudyValidity;
		studyIsPublic: boolean;
		chess: SvelteChess;
		recordMove: RecordMove;
		isChoobEnabled: boolean;
		playChoobve: (() => void) | null;
	} = $props();

	const getEngineEvaluation = async (fen: string): Promise<ChoobEvaluation> => {
		const localEval = getLocalEvaluation(fen, localEvalDepth);
		const cloudEval = await getCloudEvaluation(fen, authToken?.token?.value);
		return cloudEval ?? localEval;
	};

	let userWeightCommonMove = $state(20);
	
	let weightStudyMove = $state(80);
	let weightCommonMove = $derived(authToken.token ? userWeightCommonMove : 0)
	let weightEngineMove = $state(0);
	let weights: MoveWeight[] = $derived([
		{
			type: 'study',
			weight: weightStudyMove,
		},
		{
			type: 'common',
			weight: weightCommonMove,
		},
		{
			type: 'engine (C)',
			weight: weightEngineMove,
		},
	]);
	let localEvalDepth = $state(14);

	let userEnabledCommonMove = $state(true);
	let userEnabledStudyMove = $state(true);
	
	let enabledStudyMove = $derived((studyValidity as StudyValidity) === 'valid' ? userEnabledStudyMove : false);
	let enabledCommonMove = $derived(authToken.token ? userEnabledCommonMove : false);
	let enabledEngineMove = $state(true);
	let enabledLocalEngine = $state(true);

	playChoobve = async (engine?: Promise<ChoobEvaluation>) => {
		if (!isChoobEnabled) return

		// precompute certain move types for use in recording
		// (even if we use a study move, we want to track the win percent/centipawns)
		const common = getCommonMove({
			apiToken: authToken?.token?.value,
			fen: chess.fen,
		});
		engine ??= getEngineEvaluation(chess.fen);

		switch (Chooser.chooseWeightedObject(weights).type as MoveType) {
			case 'study':
				if (enabledStudyMove) {
					console.log('Trying study move');
					let studyMoves = await getStudyMove(studyId, chess.fen, authToken?.token?.value, studyIsPublic);
					if (studyMoves?.length) {
						let studyMove = studyMoves[Math.floor(Math.random() * studyMoves.length)].notation.notation;
						console.log(`Using study move: ${JSON.stringify(studyMove)}`);
						chess.move(studyMove);
						recordMove?.(chess, 'study');
						break;
					}
				}
			case 'common':
				if (enabledCommonMove && authToken.token) {
					console.log('Trying common move');
					const awaitedCommon = await common;
					if (awaitedCommon) {
						console.log(`Using common move: ${JSON.stringify(awaitedCommon)}`);
						chess.move(awaitedCommon.move);
						recordMove?.(chess, 'common');
						break;
					}
				}
			case 'engine (C)':
				if (enabledEngineMove && authToken.token) {
					console.log('Trying cloud engine move');
					const awaitedEngine = await engine;
					if (awaitedEngine.evalSource === 'cloud') {
						console.log(`Using cloud engine move: ${JSON.stringify(awaitedEngine.move)}`);
						chess.move(awaitedEngine.move);
						recordMove?.(chess, 'engine (C)');
						break;
					}
				}
			case 'engine (L)':
				if (enabledLocalEngine && enabledEngineMove) {
					console.log('Trying local engine move');
					const awaitedEngine = await engine;
					console.log(`Using local engine move: ${JSON.stringify(awaitedEngine.move)}`);
					chess.move(awaitedEngine.move);
					recordMove?.(chess, 'engine (L)');
				}
		}
	};
</script>

<div class="flex items-center p-5">
	<p class="mr-70">Activate Choob</p>
	<input class="w-10 h-10" class:choob={!isChoobEnabled} type="checkbox" bind:checked={isChoobEnabled} onclick={playChoobve}/>
</div>
<div class="flex items-center gap-4">
	<div
		class="
			grid grid-cols-[fit-content(100%)_1fr] gap-x-4
			*:flex *:gap-2
			*:*:first:flex-grow
		"
	>
		<div>
			<p>Study enabled:</p>
			<input type="checkbox" bind:checked={userEnabledStudyMove} disabled={studyValidity !== 'valid'} />
		</div>
		<div>
			<p>Weight</p>
			<input type="number" bind:value={weightStudyMove} min="0" max="100" disabled={studyValidity !== 'valid'} />
			<input type="range" bind:value={weightStudyMove} min="0" max="100" disabled={studyValidity !== 'valid'} />
		</div>
		<!-- TODO: force common/engine weight to 0 if authtoken is null, remove check in onMove -->
		<div>
			<p>Common enabled:</p>
			<input type="checkbox" bind:checked={enabledCommonMove} />
		</div>
		<div>
			<p>Weight</p>
			<input type="number" bind:value={weightCommonMove} min="0" max="100" disabled={!authToken.token} />
			<input type="range" bind:value={weightCommonMove} min="0" max="100" disabled={!authToken.token} />
		</div>
		<div>
			<p>Engine enabled:</p>
			<input type="checkbox" bind:checked={enabledEngineMove} />
		</div>
		<div>
			<p>Weight</p>
			<input type="number" bind:value={weightEngineMove} min="0" max="100" />
			<input type="range" bind:value={weightEngineMove} min="0" max="100" />
		</div>
		<div>
			<p>Local engine enabled:</p>
			<input type="checkbox" bind:checked={enabledLocalEngine} disabled={!enabledEngineMove} />
		</div>
		<div>
			<p>Depth</p>
			<input type="number" bind:value={localEvalDepth} min="0" max="25" />
			<input type="range" bind:value={localEvalDepth} min="0" max="25" />
		</div>
	</div>
</div>

<style>
	.choob {
		-webkit-box-shadow: 0px 0px 69px 45px rgba(235, 0, 0, 0.9);
		-moz-box-shadow: 0px 0px 69px 45px rgba(235, 0, 0, 0.9);
		box-shadow: 0px 0px 69px 45px rgba(235, 0, 0, 0.9);
	}
</style>
