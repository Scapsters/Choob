import Chooser from '../external-packages/Chooser.js';

type LichessRating = '0' | '1000' | '1200' | '1400' | '1600' | '1800' | '2000' | '2200' | '2500';
type LichessSpeed = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';

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
export async function getCommonMove(
	apiToken: string,
	{
		ratings = ['0', '1000', '1200', '1400', '1600', '1800', '2000', '2200', '2500'],
		movesToConsider = 12,
		speeds = [
			'ultraBullet',
			'bullet',
			'blitz',
			'rapid',
			'classical',
			'correspondence'
		],
		play = undefined
	}: {
		ratings?: LichessRating[],
		movesToConsider?: number,
		speeds?: LichessSpeed[],
		play?: string
	}
): Promise<string> {
	let searchParams = new URLSearchParams();
	searchParams.append('speeds', speeds.toString());
	searchParams.append('ratings', ratings.toString());
	searchParams.append('moves', movesToConsider.toString());
	if (play) searchParams.append('play', play);

	// these are non-default parameters that i think should always be these values
	// refer to https://lichess.org/api#tag/opening-explorer/GET/lichess for more info
	searchParams.append('topGames', '0');
	searchParams.append('recentGames', '0');

	const response = await fetch(`${LICHESS_EXPLORER_URL}?${searchParams.toString()}`, {
		headers: {
			Authorization: `Bearer ${apiToken}`
		}
	});
	const movesResponse = (await response.json())['moves'];

	if (movesResponse.length === 0) return ''

	type move = {
		san: string;
		weight: number;
	};
	const weightedMoves: move[] = movesResponse.map((item: { [x: string]: string | number }) => ({
		san: item['san'],
		weight: (item['white'] as number) + (item['draws'] as number) + (item['black'] as number)
	}));

	return (Chooser.chooseWeightedObject(weightedMoves) as move).san
}
