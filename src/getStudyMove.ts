import { parseGames } from '@mliebelt/pgn-parser';
import type { ParseTree } from '@mliebelt/pgn-parser';
import { Chess } from 'chess.js';

const LICHESS_STUDY_URL = 'https://lichess.org/api/study/';

type StudyMove = {
	moveNumber?: number | null;
	turn?: string;
	// the san of the move
	// 1-item object because we direct cast from ParseTree, but this is the only field we care about
	notation?: {
		notation?: string;
	};
	// all alternative paths from THIS move
	variations?: StudyMove[][];
};

type StudyGame = ParseTree & {
	moves: StudyMove[];
};

/**
 * Represents a StudyMove as a string
 * @param move the Studymove to be converted
 * @param isFirstMove pass true to avoid writing turn number if it is black's turn. some studies have moves like 4. b4 ... 4... exd4, so pass true to collapse to 4. b4 exd4
 * @returns a string representation of our single move (just the san, if black)
 */
function renderMove(move: StudyMove, isFirstMove: boolean): string {
	const tokens: string[] = [];

	// move number part
	if (
		!(move.turn === 'b' && !isFirstMove) && // skip writing move number if it's black's move and it's not the first move
		move.moveNumber !== undefined &&
		move.moveNumber !== null
	) {
		tokens.push(`${move.moveNumber}${move.turn === 'b' ? '...' : '.'}`);
	}

	// san part
	if (move.notation?.notation) {
		tokens.push(move.notation.notation);
	}

	return tokens.join(' ');
}

/**
 * Recursively traverses all variations of a game and converts their moves to PGN strings
 * @param game the StudyGame to collect PGNs from
 * @returns an array of strings of all PGNs from the game
 */
function collectPgns(game: StudyGame): string[] {
	const pgns: string[] = [];

	function visitMoves(moves: StudyMove[], path: string[]) {
		//  base case: we have no more moves to traverse
		if (moves.length === 0) {
			// only record if we have something to write
			if (path.length) {
				pgns.push(path.join(' '));
			}
			return;
		}

		const [move, ...remainingMoves] = moves;
		const renderedMove = renderMove(move, path.length === 0);
		// create a new collection so we don't mess up the other branches on this path
		const nextPath = [...path, renderedMove];

		// if we have variations, recurse their paths as well
		// start from before our move, since variations are alternatives to current move
		move.variations?.forEach((variation) => visitMoves(variation, path));

		visitMoves(remainingMoves, nextPath);
	}

	visitMoves(game.moves, []);

	return pgns;
}

/**
 * Retrieves a list of PNG strings given a lichess study. Removes overlaps
 * @param studyId the id of the study to retrieve PGNs from
 * @param isPublic true if the study is public
 * @param apiToken required if the study is not public (private/unlisted)
 * @returns all (non-overlapping & non-duplicate) branches from the study in PGN format
 */
async function getStudyPGNs(
	studyId: string,
	isPublic: boolean = true,
	apiToken?: string
): Promise<string[]> {
	let searchParams = new URLSearchParams();

	let headers = new Headers();
	if (!isPublic) {
		if (apiToken) {
			headers.append('Authorization', `Bearer ${apiToken}`);
		} else {
			throw new Error('A non-public study must provide an apiToken!');
		}
	}

	// these are non-default parameters that i think should always be these values
	// refer to https://lichess.org/api#tag/studies/GET/api/study/{studyId}.pgn for more info
	searchParams.append('clocks', 'false');
	searchParams.append('comments', 'true');
	searchParams.append('variations', 'true');
	searchParams.append('orientation', 'false');

	const response = await fetch(`${LICHESS_STUDY_URL}${studyId}.pgn?${searchParams.toString()}`, {
		headers: headers
	});

	let studyPGNs = (parseGames(await response.text()) as StudyGame[]).flatMap(collectPgns);
	// remove duplicates
	studyPGNs = [...new Set(studyPGNs)]
	// remove PGN lines that are included in other lines
	return studyPGNs
		.filter((pgn) => !studyPGNs.some((other) => other !== pgn && other.startsWith(pgn)))
		.map((PGN) => PGN.trim());
}

function getFENFromPGN(PGN: string): string {
	let chessjs = new Chess();
	chessjs.loadPgn(PGN);
	return chessjs.fen();
}

function getFENandMovesFromPGNs(PGNs: string[]): { [FEN: string] : string[] } {
	return {}
} 

/**
 * Get a random next move from a given map of FEN -> moves
 * @param FENs the FENs to search through for viable moves
 * @param currentFEN the current state of the board, in FEN, to search for next moves from
 * @returns a random move (san) from the FENs, or null if the current state does not exist in the given FENs
 */
function getMoveFromFENs(FENs: { [FEN: string] : string[] }, currentFEN: string): string | null {


	return null;
}

/**
 * Retrieves a random next move included in a lichess study based on a current position FEN
 * Probably avoid using this when we have state, just store the PGNs in state instead of fetching every time
 * @param studyId the ID of the Lichess study to analyze
 * @param currentFEN the current board state, represented in FEN
 * @param turn 'b' if black to move, 'w' if white to move
 * @param isPublic true if the study is public, false requires an apiToken
 * @param apiToken the apiToken to use if the study is private/unlisted
 * @returns a random next move, or null if no viable branch was found
 */
async function getStudyMove(
	studyId: string,
	currentFEN: string,
	isPublic: boolean = true,
	apiToken?: string
): Promise<string | null> {
	const studyPGNs = await getStudyPGNs(studyId, isPublic, apiToken);
	// console.debug(`Found PGNs from studyId ${studyId} (${studyPGNs.length} PGNs):`)
	// console.debug(studyPGNs)
	// return getMoveFromFENs(studyPGNs, currentFEN, turn);
	return new Promise<string>((resolve) => resolve(""))
}

// console.log(`Selected move: ${await getStudyMove('Utd758xx', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6')}`);