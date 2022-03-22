import '$lib/define/dangerously-all';

it('should define all vds elements', () => {
  const elements = [
    'vds-aspect-ratio',
    'vds-audio-player',
    'vds-audio',
    'vds-fake-media-player',
    'vds-fake-media-provider',
    'vds-fullscreen-button',
    'vds-gesture',
    'vds-hls-player',
    'vds-hls',
    'vds-media',
    'vds-media-controller',
    'vds-media-ui',
    'vds-media-sync',
    'vds-media-visibility',
    'vds-mute-button',
    'vds-play-button',
    'vds-poster',
    'vds-slider',
    'vds-slider-value-text',
    'vds-slider-video',
    'vds-time',
    'vds-time-slider',
    'vds-toggle-button',
    'vds-video-player',
    'vds-video',
    'vds-volume-slider',
  ];

  elements.forEach((el) => {
    expect(window.customElements.get(el)).to.be.toBeDefined;

    expect(() => {
      document.createElement(el);
    }).to.not.throw;
  });
});
