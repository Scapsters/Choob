import Chooser from '../external-packages/Chooser.js';

export type LichessRating = '0' | '1000' | '1200' | '1400' | '1600' | '1800' | '2000' | '2200' | '2500';
export type LichessSpeed = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';

export type ChoobCommonMove = {
	move: string;
	// Should add up to ~1. Should not exist when certainty is low
	winPercents?: {
		white: number;
		draws: number;
		black: number;
	};
};

const LICHESS_EXPLORER_URL = 'https://explorer.lichess.org/lichess';

/**
 * Fetch a single common move proportional to how common they are given the parameters
 * @param apiToken the OAuth2 API token to call Lichess's API with
 * @param ratings ratings ranges to include (0=0-999, 1000=1000-1199...)
 * @param movesToConsider integer representing the number of common moves to consider
 * @param speeds speed formats to allow in the search
 * @param play in UCI format, the moves that have occurred so far
 * @returns A single common move in san format
 */
export async function getCommonMove({
	apiToken,
	ratings = ['1000', '1200', '1400', '1600', '1800', '2000', '2200', '2500'],
	movesToConsider = 12,
	speeds = ['bullet', 'blitz', 'rapid', 'classical', 'correspondence'],
	fen,
}: {
	apiToken?: string;
	ratings?: LichessRating[];
	movesToConsider?: number;
	speeds?: LichessSpeed[];
	fen?: string;
}): Promise<ChoobCommonMove | null> {
	if (!apiToken) return null;

	let choobCommonMoves: ChoobCommonMove[] = [];

	// check cache
	const queryHash = getCommonMoveQueryHash({ ratings, movesToConsider, speeds, fen });
	const cachedValue = cachedCommonMoves.get(queryHash);
	if (cachedValue) {
		choobCommonMoves = cachedValue;
	} else {
		let searchParams = new URLSearchParams();
		searchParams.append('speeds', speeds.toString());
		searchParams.append('ratings', ratings.toString());
		searchParams.append('moves', movesToConsider.toString());
		if (fen) searchParams.append('fen', fen);

		// these are non-default parameters that i think should always be these values
		// refer to https://lichess.org/api#tag/opening-explorer/GET/lichess for more info
		searchParams.append('topGames', '0');
		searchParams.append('recentGames', '0');

		const response = await fetch(`${LICHESS_EXPLORER_URL}?${searchParams.toString()}`, {
			headers: {
				Authorization: `Bearer ${apiToken}`,
			},
		});
		const body = await response.json();
		const movesResponse = body['moves'];
		if (movesResponse.length === 0) return null;

		const weightedMoves = movesResponse.map((item: { [x: string]: string | number }) => ({
			san: item['san'],
			weight: (item['white'] as number) + (item['draws'] as number) + (item['black'] as number),
		})) as WeightedMove[];

		const { white, draws, black } = body;
		const sum = white + draws + black;
		const winPercents =
			sum > 25
				? {
						white: white / sum,
						draws: draws / sum,
						black: black / sum,
					}
				: undefined;

		choobCommonMoves = weightedMoves.map((move: WeightedMove) => {
			return { move: move.san, winPercents };
		});

		// cache
		cachedCommonMoves.set(queryHash, choobCommonMoves);
	}

	return Chooser.chooseWeightedObject(choobCommonMoves);
}
function getCommonMoveQueryHash(query: Parameters<typeof getCommonMove>[0]) {
	return (
		(query?.ratings?.join(',') ?? '') +
		(query?.movesToConsider ?? '') +
		(query?.speeds?.join(',') ?? '') +
		(query?.fen ?? '')
	);
}
let cachedCommonMoves: Map<string, ChoobCommonMove[]> = new Map();
type WeightedMove = {
	san: string;
	weight: number;
};
