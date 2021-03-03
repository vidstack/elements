import { css } from 'lit-element';

export const videoStyles = css`
  .container {
    position: relative;
    width: 100%;
    display: block;
    overflow: hidden;
  }

  video {
    display: inline-block;
    border-radius: inherit;
    vertical-align: middle;
    outline: 0;
    border: 0;
    user-select: none;
    max-height: 98vh;
    z-index: 0;
  }

  video:not([width]) {
    width: 100%;
  }

  video:not([height]) {
    height: auto;
  }

  .container[style*='padding-bottom'] > video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`;
