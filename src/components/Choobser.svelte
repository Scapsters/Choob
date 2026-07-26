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
	import { getCommonMove, type LichessRating, type LichessSpeed } from '$lib/chess/getCommonMove.js';
	import { getLocalEvaluation } from '../lib/chess/getLocalEvaluation.ts';
	import Chooser from '$lib/external-packages/Chooser.js';

	import { auth } from '../lib/login.svelte.ts';
	import type { StudyValidity } from './StudyValidator.svelte';
	import { getStudyMove } from '$lib/chess/getStudyMove.js';
	import type { SvelteChess } from './ChessBoard.svelte';
	import type { Chess } from 'chess.js';
	import type { RecordMove } from './GameHistory.svelte';
	import Checkbox from './ui/inputs/Checkbox.svelte';
	import NumberInput from './ui/inputs/NumberInput.svelte';
	import RangeInput from './ui/inputs/RangeInput.svelte';

	let {
		studyId,
		studyValidity,
		studyIsPublic,
		chess,
		forceEngine,
		disableMostCommonMoves,
		disableCloudEngine,
		recordMove,
		isChoobEnabled = $bindable(),
		playChoobve = $bindable(),
		maybeGetEngineEvaluation = $bindable(),
	}: {
		studyId: string;
		studyValidity: StudyValidity;
		studyIsPublic: boolean;
		chess: SvelteChess;
		forceEngine: boolean;
		disableMostCommonMoves: boolean;
		disableCloudEngine: boolean;
		recordMove: RecordMove;
		isChoobEnabled: boolean;
		playChoobve: (() => void) | null;
		maybeGetEngineEvaluation: ((fen: string) => Promise<ChoobEvaluation>) | null;
	} = $props();

	const getEvaluation = async (fen: string): Promise<ChoobEvaluation> => {
		const localEval = getLocalEvaluation(fen, localEvalDepth);
		const cloudEval = await getCloudEvaluation(fen, auth?.token?.value);
		return cloudEval ?? localEval;
	};
	maybeGetEngineEvaluation = getEvaluation;

	let userWeightCommonMove = $state(20);

	let weightStudyMove = $state(80);
	let weightCommonMove = $derived(auth.token ? userWeightCommonMove : 0);
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
	let enabledCommonMove = $derived(!auth.token ? false : userEnabledCommonMove);
	let enabledEngineMove = $state(true);
	let enabledLocalEngine = $state(true);

	let enabledSpeeds: Record<LichessSpeed, boolean> = $state({
		ultraBullet: false,
		bullet: false,
		blitz: true,
		rapid: true,
		classical: true,
		correspondence: true,
	});
	let studyMoveSpeeds: LichessSpeed[] = $derived(
		(Object.entries(enabledSpeeds) as [LichessSpeed, boolean][]).filter((entry) => entry[1]).map((entry) => entry[0])
	);
	let enabledRatings: Record<LichessRating, boolean> = $state({
		0: false,
		1000: true,
		1200: true,
		1400: true,
		1600: true,
		1800: true,
		2000: true,
		2200: true,
		2500: true,
	});
	let studyMoveRatings: LichessRating[] = $derived(
		(Object.entries(enabledRatings) as [LichessRating, boolean][]).filter((entry) => entry[1]).map((entry) => entry[0])
	);

	playChoobve = async (engine?: Promise<ChoobEvaluation>) => {
		// precompute certain move types for use in recording
		// (even if we use a study move, we want to track the win percent/centipawns)
		const getCommonMoveClosure = () =>
			getCommonMove({
				apiToken: auth?.token?.value,
				fen: chess.fen,
				ratings: studyMoveRatings,
				speeds: studyMoveSpeeds,
			});
		const common = !disableMostCommonMoves && getCommonMoveClosure();
		engine ??= getEvaluation(chess.fen);

		const previousFEN = chess.fen;

		switch (forceEngine ? 'engine (C)' : (Chooser.chooseWeightedObject(weights).type as MoveType)) {
			case 'study':
				if (enabledStudyMove) {
					try {
						let studyMoves = await getStudyMove(studyId, chess.fen, auth?.token?.value, studyIsPublic);
						if (studyMoves?.length) {
							let studyMove = studyMoves[Math.floor(Math.random() * studyMoves.length)].notation.notation;
							chess.move(studyMove);
							recordMove?.(chess, 'study', previousFEN, await common);
							break;
						}
					} catch (error) {
						console.error(error);
					}
				}
			case 'common':
				if (enabledCommonMove && auth.token) {
					try {
						const awaitedCommon = (await common) || (await getCommonMoveClosure());
						if (awaitedCommon) {
							chess.move(awaitedCommon.move);
							recordMove?.(chess, 'common', previousFEN, awaitedCommon);
							break;
						}
					} catch (error) {
						console.error(error);
					}
				}
			case 'engine (C)':
				if (!disableCloudEngine && enabledEngineMove && auth.token) {
					try {
						const awaitedEngine = await engine;
						if (awaitedEngine.evalSource === 'cloud') {
							chess.move(awaitedEngine.move);
							recordMove?.(chess, 'engine (C)', previousFEN, await common);
							break;
						}
					} catch (error) {
						console.error(error);
					}
				}
			case 'engine (L)':
				if (enabledLocalEngine && enabledEngineMove) {
					const awaitedEngine = await engine;
					chess.move(awaitedEngine.move);
					recordMove?.(chess, 'engine (L)', previousFEN, await common);
				}
		}
	};
</script>

<div class="flex flex-col items-center">
	<p class="text-right mb-3">Choob's Settings</p>

	<div class="flex items-center gap-4">
		<div
			class="
			grid grid-cols-[fit-content(100%)_1fr] gap-x-4 gap-y-2
			*:flex *:gap-2 *:items-center
			*:*:first:flex-grow *:*:text-right
		"
		>
			<div>
				<p>Study</p>
				<Checkbox bind:checked={userEnabledStudyMove} disabled={studyValidity !== 'valid'} />
			</div>
			<div>
				<p>Weight</p>
				<NumberInput bind:value={weightStudyMove} min="0" max="100" disabled={studyValidity !== 'valid'} />
				<RangeInput
					bind:value={weightStudyMove}
					min="0"
					max="100"
					disabled={studyValidity !== 'valid'}
					class="lg:w-50 w-35"
				/>
			</div>
			<div>
				<p>Common</p>
				<Checkbox bind:checked={userEnabledCommonMove} disabled={!auth.token} />
			</div>
			<div>
				<p>Weight</p>
				<NumberInput bind:value={weightCommonMove} min="0" max="100" disabled={!auth.token} />
				<RangeInput bind:value={weightCommonMove} min="0" max="100" disabled={!auth.token} class="lg:w-50 w-35" />
			</div>
			<div>
				<p>Engine</p>
				<Checkbox bind:checked={enabledEngineMove} />
			</div>
			<div>
				<p>Weight</p>
				<NumberInput bind:value={weightEngineMove} min="0" max="100" disabled={!enabledEngineMove} />
				<RangeInput
					bind:value={weightEngineMove}
					min="0"
					max="100"
					disabled={!enabledEngineMove}
					class="lg:w-50 w-35"
				/>
			</div>
			<div>
				<p>Local Engine</p>
				<Checkbox bind:checked={enabledLocalEngine} disabled={!enabledEngineMove} />
			</div>
			<div>
				<p>Depth</p>
				<NumberInput
					bind:value={localEvalDepth}
					min="0"
					max="25"
					disabled={!enabledEngineMove || !enabledLocalEngine}
				/>
				<RangeInput
					bind:value={localEvalDepth}
					min="0"
					max="25"
					disabled={!enabledEngineMove || !enabledLocalEngine}
					class="lg:w-50 w-35"
				/>
			</div>
		</div>
	</div>

	<div class="flex flex-col items-center mt-6 gap-3">
		<div class="flex flex-col 2xl:flex-row gap-1">
			<div class="flex items-center w-full 2xl:w-auto justify-center"><p>Common Move ratings</p></div>
			<div class="gap-3 grid-cols-5 grid-rows-2 grid xl:flex">
				{#each Object.entries(enabledRatings) as entry (entry[0])}
					<label class="flex flex-col items-center">
						<Checkbox bind:checked={enabledRatings[entry[0] as LichessRating]} disabled={!enabledCommonMove} />
						{entry[0]}
					</label>
				{/each}
			</div>
		</div>
		<div class="flex flex-col 2xl:flex-row gap-1">
			<div class="flex items-center w-full 2xl:w-auto justify-center"><p>Common Move speeds</p></div>
			<div class="gap-3 grid-cols-3 grid-rows-2 grid xl:flex">
				{#each Object.entries(enabledSpeeds) as entry (entry[0])}
					<label class="flex flex-col items-center">
						<Checkbox bind:checked={enabledSpeeds[entry[0] as LichessSpeed]} disabled={!enabledCommonMove}/>
						{entry[0]}
					</label>
				{/each}
			</div>
		</div>
	</div>
</div>
