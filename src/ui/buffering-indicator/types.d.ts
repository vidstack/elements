export type BufferingIndicator = BufferingIndicatorElementProps;

export interface BufferingIndicatorElementProps {
	/**
	 * Delays the showing of the buffering indicator in the hopes that it resolves itself within
	 * that delay. This can be helpful in avoiding unnecessary or fast flashing indicators that
	 * may stress the user out. The delay number is in milliseconds.
	 *
	 * @example `300` => 300 milliseconds
	 */
	delay: number;

	/**
	 * Whether the indicator should be shown while the provider/media is booting, in other words
	 * before it's ready for playback (`canPlay === false`).
	 */
	showWhileBooting: boolean;
}
