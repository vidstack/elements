---
description: Register player plugin to add `media-*` variants to Tailwind CSS.
---

# Tailwind

In this section you'll learn how to install our Tailwind CSS plugin and how to use it.

## Why?

If you're a fan of Tailwind CSS like we are, then you _really_ don't want to be forced to create
a `.css` file to handle random outlier cases. It not only slows you down and breaks your flow,
but it also goes against all the
[advantages of using utility classes](https://adamwathan.me/css-utility-classes-and-separation-of-concerns).

## Installation

You can register the plugin by adding the following to `tailwind.config.js`:

```js:title=tailwind.config.js:copy-highlight{3}
module.exports = {
  plugins: [
		require('@vidstack/player/tailwind.cjs'),
  ]
}
```

## Usage

The `<vds-media>` element exposes media state as HTML attributes and CSS properties like so:

```html
<vds-media
  paused
  waiting
  seeking
  can-play
  ...
  style="--vds-current-time: 500; --vds-duration: 1000; ..."
>
  <!-- ... -->
</vds-media>
```

:::no
If we were to write vanilla CSS to show and hide icons inside a play button, it might look
something like this:
:::

```css
.play-icon,
vds-media[paused] .pause-icon {
  opacity: 0;
}

.pause-icon,
vds-media[paused] .play-icon {
  opacity: 100;
}
```

:::yes
Using the Tailwind plugin, we could rewrite it like so:
:::

```html{7,9}
<vds-media>
  <!-- ... -->

  <div class="media-controls">
    <vds-play-button>
      <!-- Pause Icon. -->
      <svg class="opacity-100 media-paused:opacity-0"></svg>
      <!-- Play Icon. -->
      <svg class="opacity-0 media-paused:opacity-100"></svg>
    </vds-play-button>
  </div>
</vds-media>
```

Isn't that so much easier to comprehend? That's basically the plugin in a nutshell,
we'll leave the rest to your imagination. In the next sections, you'll find out more about
each of the variants and CSS variables available when using our plugin.

## Media Variants

<script>
import MediaVariantsTable from '$components/reference/MediaVariantsTable.md';
</script>

<MediaVariantsTable />

## Media CSS Variables

You can take advantage of [arbitrary values](https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values)
if you're using Tailwind CSS v3+ and use the following CSS media variables.

<script>
import MediaVarsTable from '$components/reference/MediaVarsTable.md';
</script>

<MediaVarsTable />

## Media Example

The following example showcases a track with a fill inside indicating the amount of
playback time that has passed. When the media is buffering (indicated by the `media-waiting` variant)
we change the fill background color.

```html
<div class="relative h-6 w-full bg-gray-200">
  <div
    class="
			media-waiting:bg-sky-500 absolute top-0 left-0 h-full w-full
			origin-left
			scale-x-[calc(var(--vds-current-time)/var(--vds-duration))]
			transform bg-gray-400 will-change-transform
		"
  ></div>
</div>
```
