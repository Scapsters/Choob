import type { ChoobEvaluation } from './getCloudEvaluation';

// https://stackoverflow.com/a/68945416
const wasmSupported =
	typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
const stockfish =
	typeof window !== 'undefined' && new Worker(wasmSupported ? 'stockfish/stockfish.wasm.js' : 'stockfish/stockfish.js');

export const evalCache = new Map<string, object>();

const extractMoveFromUci = (uci: string) => {
	let from = uci.slice(0, 2);
	let to = uci.slice(2, 4);

	// stockfish shows castling differently than how chess.js likes it
	if (from === 'e1' && to === 'h1') {
		to = 'g1';
	} else if (from === 'e1' && to === 'a1') {
		to = 'c1';
	} else if (from === 'e8' && to === 'h8') {
		to = 'g8';
	} else if (from === 'e8' && to === 'a8') {
		to = 'c8';
	}

	// TODO: promotion

	return { from, to };
};

/**
 * Sends the given commands to stockfish one at a time, then waits until stockfish sends a matching message for each given desired response.
 * A message from stockfish is matching if it contains the desired response anywhere in it.
 *
 * Only sends the last matching response for each desired response.
 * Each desired response should correlate to a unique message in the [UCI protocol](https://www.wbec-ridderkerk.nl/html/UCIProtocol.html).
 * There are no guarantees reguarding conflicts.
 *
 * @returns A promise for a map of each desired response and its corresponding message
 */
async function waitForResponse(commands: string[], desiredResponses?: string[] | string) {
	if (!stockfish) throw new Error('Stockfish not found');

	/**
	 * For every message, see if it matches one of our desired responses.
	 *
	 * If there is none, return the first message
	 * If theres only one, return the data on the first matching message
	 * If there are multiple, collect each matching message with its corresponding desired reponse,
	 * then when there is something for all desired messages, return them
	 *
	 * A single entry array would act near-identically to a string, but its kind of unergonomic
	 */
	const responses = new Map<string, string>();
	const promise = new Promise((resolve) => {
		stockfish.onmessage = (e) => {
			if (!desiredResponses || desiredResponses?.length === 0) {
				resolve(e.data);
				return;
			}

			if (typeof desiredResponses === 'string') {
				if (e.data.includes(desiredResponses)) {
					resolve(e.data);
					return;
				}
				return;
			}

			// arrays are objects /:
			if (typeof desiredResponses === 'object') {
				const matchedResponse = desiredResponses.find((r) => e.data.includes(r));

				if (matchedResponse) responses.set(matchedResponse, e.data);
				if (desiredResponses?.every((r) => responses.has(r))) resolve(responses);
			}
		};
	});
	for (const command of commands) {
		stockfish.postMessage(command);
	}
	return promise as Promise<typeof desiredResponses extends string ? string : Map<string, string>>;
}

export async function initializeStockfish() {
	return waitForResponse(['uci'], 'uciok').then(() => waitForResponse(['isready'], 'readyok'));
}

export async function getLocalEvaluation(fen: string, depth: number): Promise<ChoobEvaluation> {
	const blackToMove = fen.split(' ')[1] === 'b';

	const data = await waitForResponse([`position fen ${fen}`, `go depth ${depth}`], ['score', 'bestmove']);

	const scoreParts = data.get('score')!.split(' ');
	const scoreIndex = scoreParts.findIndex((part) => part === 'score');
	const isMate = scoreParts[scoreIndex + 1] === 'mate';
	const value = Number(scoreParts[scoreIndex + 2]) * (blackToMove ? -1 : 1);
	const centipawns = isMate ? `#${value}` : value;

	const bestMoveParts = data.get('bestmove')!.split(' ');
	const bestMoveIndex = bestMoveParts.findIndex((part) => part === 'bestmove')!;
	const move = extractMoveFromUci(bestMoveParts[bestMoveIndex + 1]);

	return { move, centipawns, evalSource: 'local' };
}
