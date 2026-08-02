<details>
	<summary class="author-icon-container"><div class="author-bar-button-container"><div class="author-icon"></div></div></summary>
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

	.author-icon::before {
		content: '';
		position: absolute;
		width: 1em;
		top: 0.35em;
		transform: skewY(40deg);

		transition:
			height 150ms linear,
			top 150ms linear,
			transform 350ms ease-in-out,
			background-color 200ms cubic-bezier(0.35, 0.05, 0.795, 0.035);
	}
	.author-icon::before {
		background-color: var(--background);
	}
	details[open] .author-icon::before {
		background-color: color-mix(in lab, rgba(0, 0, 0, 1) 70%, var(--background) 30%);
	}

	/* grow bar on hover */
	.author-icon::before {
		height: 0.25em;
	}
	.author-icon:hover::before {
		height: 0.5em;
		top: 0.25em;
	}

	/* move icon on open */
	details[open] .author-icon {
		left: calc(150px - 0.5em);
	}
	details[open] .author-bar-button-container {
		left: calc(140px - 0.5em);
	}

	/* spin bar on open */
	.author-icon::before {
		transform: rotate(180);
	}
	details[open] .author-icon::before {
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
