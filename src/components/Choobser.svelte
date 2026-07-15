<script module lang="ts">
	export type MoveType = 'study' | 'common' | 'engine (C)' | 'engine (L)' | 'player';
	export type MoveWeight = {
		type: MoveType;
		weight: number;
	};
	export type ChessMove = Parameters<Chess['move']>[0]
	export type doMove = (move: ChessMove, moveType: MoveType) => void
</script>

<script lang="ts">
	import { getCloudEvaluation, type ChoobEvaluation } from '$lib/chess/getCloudEvaluation.js';
	import { getCommonMove } from '$lib/chess/getCommonMove.js';
	import { getLocalEvaluation } from '../lib/chess/getLocalEvaluation.ts';
	import Chooser from '$lib/external-packages/Chooser.js';

	import { authToken } from '../lib/login.svelte.ts';
	import type { StudyValidity } from './StudyValidator.svelte';
	import { getStudyMove } from '$lib/chess/getStudyMove.js';
	import type { onMoveHandler, SvelteChess } from './ChessBoard.svelte';
	import type { Chess } from 'chess.js';

	let {
		studyId,
		studyValidity,
		studyIsPublic,
		chess,
		doMove,
		registerOnMoveHandler,
		playChoobMove = $bindable()
	}: {
		studyId: string,
		studyValidity: StudyValidity;
		studyIsPublic: boolean;
		chess: SvelteChess;
		doMove: doMove;
		registerOnMoveHandler: ((handler: onMoveHandler) => void) | null;
		playChoobMove: (() => void) | null
	} = $props();

	const createGetEngineEvaluation =
		(localEvalDepth: number) =>
		async (fen: string): Promise<ChoobEvaluation> => {
			const localEval = getLocalEvaluation(fen, localEvalDepth);
			const cloudEval = await getCloudEvaluation(fen, authToken?.token?.value);
			return cloudEval ?? localEval;
		};

	let weightCommonMove = $state(20);
	let weightStudyMove = $state(80);
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
	let finalEnabledCommonMove = $derived(authToken.token ? userEnabledCommonMove : false);
	let userEnabledStudyMove = $state(true);
	let finalEnabledStudyMove = $derived((studyValidity as StudyValidity) === 'valid' ? userEnabledStudyMove : false);

	let enabledEngineMove = $state(true);
	let enabledLocalEngine = $state(true);

	$effect(() => void (weightCommonMove = authToken.token ? weightCommonMove : 0));

	playChoobMove = async (engine?: Promise<ChoobEvaluation>) => {
		// precompute certain move types for use in recording
		// (even if we use a study move, we want to track the win percent/centipawns)
		const common = getCommonMove({
			apiToken: authToken?.token?.value,
			fen: chess.fen,
		});
		const getEngineEvaluation = createGetEngineEvaluation(localEvalDepth);
		engine ??= getEngineEvaluation(chess.fen);

		switch (Chooser.chooseWeightedObject(weights).type as MoveType) {
			case 'study':
				if (userEnabledStudyMove) {
					console.log('Trying study move');
					let studyMoves = await getStudyMove(studyId, chess.fen, authToken?.token?.value, studyIsPublic);
					if (studyMoves?.length) {
						let studyMove = studyMoves[Math.floor(Math.random() * studyMoves.length)].notation.notation;
						console.log(`Using study move: ${JSON.stringify(studyMove)}`);
						doMove(studyMove, 'study');
						break;
					}
				}
			case 'common':
				if (userEnabledCommonMove && authToken.token) {
					console.log('Trying common move');
					const awaitedCommon = await common;
					if (awaitedCommon) {
						console.log(`Using common move: ${JSON.stringify(awaitedCommon)}`);
						doMove(awaitedCommon.move, 'common');
						break;
					}
				}
			case 'engine (C)':
				if (enabledEngineMove && authToken.token) {
					console.log('Trying cloud engine move');
					const awaitedEngine = await engine;
					if (awaitedEngine.evalSource === 'cloud') {
						console.log(`Using cloud engine move: ${JSON.stringify(awaitedEngine.move)}`);
						doMove(awaitedEngine.move, 'engine (C)');
						break;
					}
				}
			case 'engine (L)':
				if (enabledLocalEngine && enabledEngineMove) {
					console.log('Trying local engine move');
					const awaitedEngine = await engine;
					console.log(`Using local engine move: ${JSON.stringify(awaitedEngine.move)}`);
					doMove(awaitedEngine.move, 'engine (L)');
				}
		}
	};
</script>

<div class="flex items-center gap-4">
	<p>Enabled</p>
	<div>
		<div>
			<input type="checkbox" bind:checked={userEnabledStudyMove} disabled={studyValidity !== 'valid'} />
			Study move weight:
			<input type="number" bind:value={weightStudyMove} min="0" max="100" disabled={studyValidity !== 'valid'} />
			<input type="range" bind:value={weightStudyMove} min="0" max="100" disabled={studyValidity !== 'valid'} />
		</div>
		<!-- TODO: force common/engine weight to 0 if authtoken is null, remove check in onMove -->
		<div>
			<input type="checkbox" bind:checked={finalEnabledCommonMove} />
			Common move weight:
			<input type="number" bind:value={weightCommonMove} min="0" max="100" disabled={!authToken.token} />
			<input type="range" bind:value={weightCommonMove} min="0" max="100" disabled={!authToken.token} />
		</div>
		<div>
			<input type="checkbox" bind:checked={enabledEngineMove} />
			Engine move weight:
			<input type="number" bind:value={weightEngineMove} min="0" max="100" />
			<input type="range" bind:value={weightEngineMove} min="0" max="100" />
		</div>
		<div>
			<input type="checkbox" bind:checked={enabledLocalEngine} disabled={!enabledEngineMove} />
			Local engine depth:
			<input type="number" bind:value={localEvalDepth} min="0" max="25" />
			<input type="range" bind:value={localEvalDepth} min="0" max="25" />
		</div>
	</div>
</div>
