<script lang="ts">
	import { Chess } from 'chess.js';
	import 'svelte5-chessground/style.css';
	import ChessBoard from '../components/ChessBoard.svelte';

	const chess = new Chess();
</script>

<ChessBoard {chess} />
