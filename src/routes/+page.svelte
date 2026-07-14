<script module>
	import type { ChoobEvaluation } from '../lib/chess/getCloudEvaluation.ts';

	export type MoveType = 'study' | 'common' | 'engine (C)' | 'engine (L)' | 'player';
	export type MoveWeight = {
		type: MoveType;
		weight: number;
	};
	export type ChoobHistoryEntry = ChoobEvaluation & {
		san: string;
		moveSource: MoveType;
		winPercents?: ChoobCommonMove['winPercents'];
	};
	export type ChoobHistory = [ChoobHistoryEntry, ChoobHistoryEntry | null][];
</script>

<script lang="ts">
	import 'svelte5-chessground/style.css';
	import ChessBoard, { SvelteChess } from '../components/ChessBoard.svelte';
	import { Login, authToken } from '../lib/login.svelte.ts';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import type { Color } from 'chess.js';
	import { getStudyMove } from '../lib/chess/getStudyMove.ts';
	import Chooser from '../lib/external-packages/Chooser.js';
	import { getCommonMove, type ChoobCommonMove } from '../lib/chess/getCommonMove.ts';
	import { getCloudEvaluation } from '../lib/chess/getCloudEvaluation.ts';
	import { getLocalEvaluation, initializeStockfish } from '../lib/chess/getLocalEvaluation.ts';
	import ChapterPicker, { type StudyChapter } from '../components/ChapterPicker.svelte';

	let login: Login;
	onMount(() => {
		const url = new SvelteURL(page.url.href);
		url.search = '';
		login = new Login(url.href);
		login.init();

		initializeStockfish();
	});

	let chess = $state(new SvelteChess());
	type ColorChoice = Color | 'random';
	let playerColor = $state<Color>('w');
	let playerColorChoice = $state<ColorChoice>('w');

	let startingFen = $state<string>('');
	let selectedChapter = $state<StudyChapter>();

	let choobHistory = $state<ChoobHistory>([]);

	let studyId = $state('mzJ7q0W7');
	let studyIsPublic = $state(true);
	let weightCommonMove = $state(0);
	$effect(() => void (weightCommonMove = authToken.token ? weightCommonMove : 0));
	let weightStudyMove = $state(100);
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

	let enabledCommonMove = $state(true);
	let enabledStudyMove = $state(true);
	let enabledEngineMove = $state(true);
	let enabledLocalEngine = $state(true);

	/**
	 * Add entry to history based on color. "white" creates a new move and
	 * "black" appends to the most recent white move.
	 *
	 * Most calls to this function will reverse color, because they are after a chess.move().
	 * This is to get the SAN sometimes
	 */
	const addEntryToHistory = (turn: Color, entry: ChoobHistoryEntry) => {
		if (turn === 'w') choobHistory.push([entry, null]);
		else {
			const currentMove = choobHistory[choobHistory.length - 1];
			currentMove[1] = entry;
		}
	};

	const getEngineEvaluation = async (fen: string): Promise<ChoobEvaluation> => {
		const localEval = getLocalEvaluation(fen, localEvalDepth);
		const cloudEval = await getCloudEvaluation(fen, authToken?.token?.value);
		return cloudEval ?? localEval;
	};

	const makeAndRecordMove = async (move: string | { from: string; to: string }, source: MoveType) => {
		chess.move(move);
		const history = chess.chess.history();
		const engine = getEngineEvaluation(chess.fen);
		const common = getCommonMove({
			apiToken: authToken?.token?.value,
			fen: chess.fen,
		});
		addEntryToHistory(chess.turn === 'w' ? 'b' : 'w', {
			...(await engine),
			san: history[history.length - 1],
			moveSource: source,
			winPercents: (await common)?.winPercents,
		});
	};

	let playOpponentMove = $derived(async (engine?: Promise<ChoobEvaluation>) => {
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
						makeAndRecordMove(studyMove, 'study');
						break;
					}
				}
			case 'common':
				if (enabledCommonMove) {
					console.log('Trying common move');
					const awaitedCommon = await common;
					if (awaitedCommon) {
						console.log(`Using common move: ${JSON.stringify(awaitedCommon)}`);
						makeAndRecordMove(awaitedCommon.move, 'common');
						break;
					}
				}
			case 'engine (C)':
				if (enabledEngineMove) {
					if (authToken?.token?.value !== undefined) {
						console.log('Trying cloud engine move');
						const awaitedEngine = await engine;
						if (awaitedEngine.evalSource === 'cloud') {
							console.log(`Using cloud engine move: ${JSON.stringify(awaitedEngine.move)}`);
							makeAndRecordMove(awaitedEngine.move, 'engine (C)');
							break;
						}
					}
				}
			case 'engine (L)':
				if (enabledLocalEngine && enabledEngineMove) {
					console.log('Trying local engine move');
					const awaitedEngine = await engine;
					console.log(`Using local engine move: ${JSON.stringify(awaitedEngine.move)}`);
					makeAndRecordMove(awaitedEngine.move, 'engine (L)');
				}
		}
	});
</script>

<button onclick={() => login.login()}> bello </button>
<button onclick={() => login.logout()}> buhbye </button>
<p><b>Access token:</b> {authToken?.token?.value || 'Not logged in'}</p>
<ChessBoard {chess} {playOpponentMove} {addEntryToHistory} {getEngineEvaluation} {playerColor} />

<div>
	<label><input type="radio" bind:group={playerColorChoice} value="w" />White</label>
	<label><input type="radio" bind:group={playerColorChoice} value="random" />Random</label>
	<label><input type="radio" bind:group={playerColorChoice} value="b" />Black</label>
</div>

<div class="mb-4">
	<button
		onclick={() => {
			chess = new SvelteChess(selectedChapter?.fenToPlayFrom ?? startingFen);
			choobHistory = [];
			playerColor = playerColorChoice === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : playerColorChoice;
			if (playerColor === 'b') playOpponentMove();
		}}>New Game</button
	>
</div>

<div>
	Study ID: <input bind:value={studyId} placeholder="Input study Id..." />
	Study is public? <input type="checkbox" bind:checked={studyIsPublic} />
</div>
<ChapterPicker bind:selectedChapter {studyId} />

<div class="flex items-center gap-4">
	<p>Enabled</p>
	<div>
		<div>
			<input type="checkbox" bind:checked={enabledStudyMove} />
			Study move weight:
			<input type="number" bind:value={weightStudyMove} min="0" max="100" />
			<input type="range" bind:value={weightStudyMove} min="0" max="100" />
		</div>
		<!-- TODO: force common/engine weight to 0 if authtoken is null, remove check in onMove -->
		<div>
			<input type="checkbox" bind:checked={enabledCommonMove} />
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

<button
	onclick={() => window.open(`https://lichess.org/analysis/pgn/${encodeURIComponent(chess.chess.pgn())}`, '_blank')}
>
	Lichess Button
</button>
<button onclick={() => playOpponentMove()}> Lichess Button (Evil) </button>

<p>Starting FEN</p>
<p>
	<input type="text" bind:value={startingFen} />
</p>

<button onclick={() => (startingFen = chess.fen)}>Make current FEN starting FEN</button>

<table>
	<thead>
		<tr class="*:px-3">
			<td>Move</td>
			<td>Eval</td>
			<td>Source</td>
			<td>Win% (W)</td>
			<td>Move</td>
			<td>Eval</td>
			<td>Source</td>
			<td>Win% (W)</td>
		</tr>
	</thead>
	<tbody>
		{#each choobHistory as entry (entry)}
			<tr class="*:text-center">
				<td>{entry[0].san}</td>
				<td>{entry[0].centipawns}</td>
				<td>{entry[0].moveSource}</td>
				<td>{Math.round((entry[0].winPercents?.white ?? 0) * 100) || '-'}</td>
				<td>{entry[1]?.san ?? '-'}</td>
				<td>{entry[1]?.centipawns ?? '-'}</td>
				<td>{entry[1]?.moveSource ?? '-'}</td>
				<td>{Math.round((entry[1]?.winPercents?.white ?? 0) * 100) || '-'}</td>
			</tr>
		{/each}
	</tbody>
</table>
