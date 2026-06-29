// https://lichess.org/api#tag/analysis/GET/api/cloud-eval
type LichessCloudEvaluation = {
	fen: string;
	pvs: {
		moves: string; // "d1e7 d8e7 ..."
		cp: number; // 41 (centipawns)
	}[];
};

type ChoobEvaluation = {
	centipawns: number;
	move: {
		from: string;
		to: string;
	};
};

const LICHESS_CLOUD_EVAL_URL = 'https://lichess.org/api/cloud-eval';

/**
 * @param fen FEN to retrieve eval for
 * @param apiToken Lichess API token
 * @returns null if no eval was found, rating and best move otherwise
 */
export async function getEngineEvaluation(
	fen: string,
	apiToken: string
): Promise<ChoobEvaluation | null> {
	const url = new URL(LICHESS_CLOUD_EVAL_URL);
	url.searchParams.append('fen', fen);

	const headers = new Headers();
	headers.append('Authorization', `Bearer ${apiToken}`);

	const response = await fetch(url, { headers });
	if (response.status === 404) {
		return null;
	}

	const body = (await response.json()) as LichessCloudEvaluation;
	return {
		centipawns: body.pvs[0].cp,
		move: {
			from: body.pvs[0].moves.split(' ')[0].substring(0, 2),
			to: body.pvs[0].moves.split(' ')[0].substring(2, 4)
		}
	};
}
