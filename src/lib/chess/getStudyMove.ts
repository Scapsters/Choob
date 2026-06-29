import { parseGames } from '@mliebelt/pgn-parser';
import type { ParseTree } from '@mliebelt/pgn-parser';
import { Chess } from 'chess.js';

const LICHESS_STUDY_URL = 'https://lichess.org/api/study/';

type StudyGame = ParseTree;
type StudyMove = ParseTree['moves'][number];
type StudyGameTree = Omit<StudyGame, 'moves'> & { moveTree: MoveNode };

interface TreeNode<T> {
	branches: T[];
}
type MoveNode = Omit<StudyMove, 'variations'> & TreeNode<MoveNode>;
// A MoveNode, except with a fen. Is not `MoveNode & fen` because TreeNode's subtype also needs to have a fen
type MoveNodeWithFEN = TreeNode<MoveNodeWithFEN> & Omit<StudyMove, 'variations'> & { fen: string };

/**
 * Saves all immediately proceeding moves (across variations and mainline) in the `branches` property for each node in the given mainline.
 * Discards the `variations` property.
 * Makes no guarantees on branch order.
 *
 * Example:
 * ```
 * convertStudyGameToTree({
 * 	...otherGameProps,
 * 	moves: [
 * 		{ notation: 'e4', variations: 'c5', 'd5' },
 * 		{ notation: 'e5' },
 * 		{ notation: 'Nf3' }
 * ]
 * })
 * const result = {
 * 	...otherGameProps,
 *  moveTree: {
 * 		notation: 'e4',
 * 		branches: [
 * 			{
 * 				notation: 'e5',
 * 				branches: [{ notation: 'Nf3' }]
 * 			},
 * 			{ notation: 'c5' },
 * 			{ notation: 'd5' },
 * 		]
 * 	}
 * }
 * ```
 */
function convertStudyGameToTree(studyGame: StudyGame): StudyGameTree {
	const convertStudyMoveToTree = (studyMoves: StudyMove[], previousNode?: MoveNode): MoveNode => {
		const node: MoveNode = { ...studyMoves[0], branches: [] };

		if (studyMoves.length <= 1) return node;

		studyMoves[0].variations.forEach((variation) =>
			previousNode?.branches.push(convertStudyMoveToTree(variation, node))
		);
		node.branches.push(convertStudyMoveToTree(studyMoves.toSpliced(0, 1), node));

		return node;
	};

	return {
		...studyGame,
		moveTree: convertStudyMoveToTree(studyGame.moves)
	};
}

/**
 * Traverses the given tree, putting each node and every parent of the node through the given function.
 * This function is a mutator.
 */
function traverseTreePassParents<T extends TreeNode<T>>(
	node: T,
	func: (node: T, parents: T[]) => void,
	parents: T[] = []
): void {
	node.branches.forEach((branch) => traverseTreePassParents(branch, func, [...parents, node]));
	func(node, parents);
}

/**
 * Maps the given tree, putting each node and every parent of the node through the given function.
 *
 * This function is not (meant to be) a mutator! The given function needs to return a node.
 * Here is what a 1:1 map would look like. Note that parents is ignored:
 * ```
 * mapTree(node, (node, parents, mappedBranches) => { ...node, branches: mappedBranches })
 * ```
 *
 * May or may not mutate the given tree.
 */
function mapTreePassParents<R extends TreeNode<R>, T extends TreeNode<T>>(
	node: T,
	func: (node: T, parents: T[], mappedBranches: R[]) => R,
	parents: T[] = []
): R {
	const mappedBranches = node.branches.map((branch) =>
		mapTreePassParents(branch, func, [...parents, node])
	);
	return func(node, parents, mappedBranches);
}

/**
 * Returns a fen with the half-move and whole-move counter set to 0
 */
function makeFENMoveAgnostic(fen: string) {
	return [...fen.split(' ').splice(4), 0, 0].join(' ');
}

/**
 * Creates a Map of every study move and all of its FEN's possible next moves across all given trees.
 */
function createFENAssociationMap(studyGameTrees: StudyGameTree[]) {
	const createBoard = (startingFEN: string | undefined, moves: MoveNode[]) => {
		const applyMoveToBoard = (board: Chess, move: MoveNode) => {
			const notation = move.notation?.notation;
			if (!notation)
				throw new Error(
					`Error applying move to board, study move undefined or falsy: ${move}. studyGameTrees: ${studyGameTrees}`
				);
			board.move(notation);
		};
		const board = new Chess(startingFEN);
		moves.forEach((move) => applyMoveToBoard(board, move));
		return board;
	};

	const moveTreesWithFEN = studyGameTrees.map((game) =>
		mapTreePassParents(
			game.moveTree,
			(node, parentMoves, mappedBranches): MoveNodeWithFEN => ({
				...node,
				branches: mappedBranches,
				fen: makeFENMoveAgnostic(createBoard(game.tags?.FEN, [...parentMoves, node]).fen())
			})
		)
	);

	const FENAssociations = new Map<string, MoveNode[]>();
	moveTreesWithFEN.forEach((root) =>
		traverseTreePassParents(root, (node, parentMoves) => {
			if (parentMoves.length === 0) return;
			const moveBeforeCurrent = parentMoves[parentMoves.length - 1];

			const existingNextMoveSet = FENAssociations.get(moveBeforeCurrent.fen);
			if (!existingNextMoveSet) FENAssociations.set(moveBeforeCurrent.fen, []);

			FENAssociations.get(moveBeforeCurrent.fen)!.push(node);
		})
	);
	return FENAssociations;
}

let studyGames = new Map<string, StudyGame[]>();
/**
 * Retrieves a list of PNG strings given a lichess study. Removes overlaps
 * @param lichessStudyId the id of the study to retrieve PGNs from
 * @param isPublic true if the study is public
 * @param apiToken required if the study is not public (private/unlisted)
 * @returns StudyGame for every chapter of the Lichess Study referred to by the given studyId
 */
async function getStudyGames(
	lichessStudyId: string,
	isPublic: boolean = true,
	apiToken?: string
): Promise<StudyGame[]> {
	// check cache
	let studyGame = studyGames.get(lichessStudyId);
	if (studyGame) return studyGame;

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

	const response = await fetch(
		`${LICHESS_STUDY_URL}${lichessStudyId}.pgn?${searchParams.toString()}`,
		{
			headers: headers
		}
	);
	const games = response.text().then(parseGames);

	// cache
	games.then((games) => studyGames.set(lichessStudyId, games));

	return games;
}

/**
 * Hashes a Lichess Study by its "StudyName" field and its "UTCDate" and "UTCTime".
 * Some of these are a Lichess-specific tags.
 * @throws If there are no chapters or if any tags do not exist.
 * @param games An array of StudyGames representing a collection of Lichess Study Chapters.
 */
let getStudyHash = (games: StudyGame[]): string => {
	if (games.length === 0)
		throw new Error(
			`Error getting study key, study game had length 0. Does the associated Lichess study have any chapters? games: ${games}`
		);

	const tags = games[0].tags as Record<string, string | undefined> | undefined;
	if (!tags)
		throw new Error(`Tags was undefined or falsy. Games: ${games}. Tags: ${games[0].tags}`);

	const attributes = [tags['StudyName'], tags['UTCDate'], tags['UTCTime']];
	if (attributes.some((v) => !v))
		throw new Error(`Tag attribute was undefined or falsy: values: ${attributes}`);

	return attributes.join();
};
let preparedStudies = new Map<string, ReturnType<typeof prepareStudy>>();

/**
 * Mutates the given array of study games and returns a FEN association map. See {@link createFENAssociationMap}
 * @param games An array of StudyGames representing a collection of Lichess Study Chapters.
 */
function prepareStudy(games: StudyGame[]): {
	studyGameTrees: StudyGameTree[];
	fenAssociationMap: Map<string, MoveNode[]>;
} {
	// check cache
	let preparedStudy = preparedStudies.get(getStudyHash(games));
	if (preparedStudy) return preparedStudy;

	const studyGameTrees = games.map((game) => convertStudyGameToTree(game));
	const fenAssociationMap = createFENAssociationMap(studyGameTrees);

	// cache
	preparedStudies.set(getStudyHash(games), {
		studyGameTrees,
		fenAssociationMap
	});

	return { studyGameTrees, fenAssociationMap };
}

/**
 * Returns a random move from the given Study's chapters that follow the given FEN.
 * @param lichessStudyId id of Lichess Study to search
 * @param currentFEN fen to search
 * @returns Array of next moves in SAN. Not guaranteed to be ordered or stable
 */
async function getStudyMove(lichessStudyId: string, currentFEN: string) {
	const games = await getStudyGames(lichessStudyId, true);
	const preparedStudy = prepareStudy(games);
	return preparedStudy.fenAssociationMap.get(makeFENMoveAgnostic(currentFEN));
}

// const chess = new Chess();
// chess.loadPgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6');

// getStudyMove('Utd758xx', chess.fen()).then((move) => {
// 	console.log(move?.notation.notation);
// });
// getStudyMove('Utd758xx', chess.fen()).then((move) => {
// 	console.log(move?.notation.notation);
// });
// getStudyMove('Utd758xx', chess.fen()).then((move) => {
// 	console.log(move?.notation.notation);
// });
// getStudyMove('Utd758xx', chess.fen()).then((move) => {
// 	console.log(move?.notation.notation);
// });
