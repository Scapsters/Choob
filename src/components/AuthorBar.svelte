<details>
	<summary class="author-icon-container">
		<div class="author-bar-button-container">
			<div class="author-icon">
				<svg class="author-mask-svg" aria-hidden="true">
					<mask id="author-icon-mask" maskContentUnits="userSpaceOnUse">
						<rect class="author-mask-keep"></rect>
						<rect class="author-mask-bar"></rect>
					</mask>
				</svg>
			</div>
		</div>
	</summary>
	<ul class="author-bar">
		<p>I'm Scott Happy, hiiiii</p>
		<p>
			Choob is meant to help you learn openings without memorizing them. Its features are purposefully incomplete to
			encourage you to use it alongisde a Lichess Study.
		</p>
		<p>
			It's biggest feature is to take a position, then decide to either play a random move from your study or play a
			random move from the Lichess game set. This should help you practice your lines while making sure you understand
			how to play against deviations.
		</p>
		<p></p>
		<p>As with my personal projects, this was made largely without AI.</p>
		<p>
			If you are... professionally gifted... check me out <a href="https://scotthappy.com">here</a>
		</p>
	</ul>
</details>

<style>
	.author-bar-button-container {
		position: relative;
		background-color: transparent;
		z-index: 10000;
		width: 40px;
		height: 40px;
	}

	.author-icon-container::marker {
		content: '';
	}

	.author-icon {
		z-index: 1001;
		position: fixed;
		top: 0.75em;
		left: 0.75em;
		width: 1em;
		height: 1em;
		transform: skewY(-20deg);
		/* the notch is a real hole (mask), so the icon works over any backdrop */
		mask: url(#author-icon-mask);

		transition:
			background-color 150ms linear,
			left 200ms cubic-bezier(0.35, 0.05, 0.795, 0.035);
	}
	.author-icon {
		background-color: oklch(0.7 0.12 170);
	}
	:global(.dark .author-icon) {
		background-color: oklch(0.7 0.12 170);
	}

	/* change color on hover */
	.author-icon:hover {
		background-color: oklch(0.7 0.12 170);
	}
	:global(.dark .author-icon:hover) {
		background-color: oklch(0.8 0.12 170);
	}

	.author-mask-svg {
		position: absolute;
		width: 0;
		height: 0;
	}
	.author-mask-keep {
		x: -0.5em;
		y: -0.5em;
		width: 2em;
		height: 2em;
		fill: white;
	}
	.author-mask-bar {
		x: 0;
		width: 1em;
		y: 0.35em;
		height: 0.25em;
		fill: black;
		transform: skewY(40deg);
		transform-box: fill-box;
		transform-origin: 50% 50%;

		transition:
			height 150ms linear,
			y 150ms linear,
			transform 350ms ease-in-out;
	}

	/* grow bar on hover */
	.author-icon:hover .author-mask-bar {
		height: 0.5em;
		y: 0.25em;
	}

	/* move icon on open */
	details[open] .author-icon {
		left: calc(150px - 0.5em);
	}
	details[open] .author-bar-button-container {
		left: calc(140px - 0.5em);
	}

	/* spin bar on open */
	details[open] .author-mask-bar {
		transform: rotate(-180deg);
	}

	.author-bar {
		position: fixed;
		z-index: 1000;
		width: 300px;
		height: 100vh;
		background-color: color-mix(in lab, rgba(0, 0, 0, 1) 70%, transparent 30%);
		top: 0;

		padding-top: 2.5em;
		padding-left: 2em;
		padding-right: 2em;

		transition: opacity 200ms cubic-bezier(0.35, 0.05, 0.795, 0.035);
	}

	.author-bar p {
		color: var(--background);
		font-family: 'Lexend';
		margin-bottom: 2em;
		margin-top: 1em;
	}
	:global(.dark .author-bar p) {
		color: var(--foreground);
	}
	.author-bar a {
		font-family: 'Lexend';
		color: cornflowerblue;
	}
	.author-bar a:hover {
		text-decoration: underline;
	}

	.author-bar {
		opacity: 0;
	}
	details[open] .author-bar {
		opacity: 1;

		@starting-style {
			opacity: 0;
		}
	}
	details::details-content {
		transition: content-visibility 200ms allow-discrete;
	}
</style>
