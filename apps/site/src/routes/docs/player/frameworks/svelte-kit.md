# SvelteKit

In this section, you'll find a simple overview of how to use the library with
[SvelteKit](https://kit.svelte.dev).

## Setup

You'll find most the information you need for working with Vidstack Player in our
[Svelte guide](../libraries/svelte.md), but there are some issues to avoid when working
in a SvelteKit application due to hydration.

Currently, [Svelte doesn't hydrate custom elements correctly](https://github.com/sveltejs/svelte/issues/7379)
which will leave your components in an invalid state. We can work around this by lazy loading
our components so they're only loaded client-side like so:

```svelte:title=Player.svelte
<script>
  import '@vidstack/player/define/vds-media.js';
  import '@vidstack/player/define/vds-video.js';

  export let src;
  export let poster;
</script>

<vds-media>
  <vds-video {poster}>
    <video {src} controls preload="none" />
  </vds-video>
</vds-media>
```

```svelte:title=LazyPlayer.svelte:copy
<script>
  export let src;
  export let poster;
</script>

{#await import('./Player.svelte')}
  <!-- Render video if JavaScript is disabled. -->
  <video {src} {poster} controls preload="none" />
{:then Player}
  <svelte:component {src} {poster} this={Player.default} />
{/await}
```

```svelte:title=Page.svelte:copy
<script>
  import LazyPlayer from './LazyPlayer.svelte';
</script>

<LazyPlayer src="..." poster="..." />
```
