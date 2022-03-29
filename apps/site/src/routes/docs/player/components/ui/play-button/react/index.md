<script>
import Docs from '../_Docs.md';
</script>

<Docs>

```jsx:copy:slot=usage
<PlayButton>
  <div className="media-play">Play</div>
  <div className="media-pause">Pause</div>
</PlayButton>
```

```jsx:copy:slot=styling
<PlayButton>
	<svg className="media-play-icon" ariaHidden="true" viewBox="0 0 24 24">
		<path
			fill="currentColor"
			d="M19.376 12.416L8.777 19.482A.5.5 0 0 1 8 19.066V4.934a.5.5 0 0 1 .777-.416l10.599 7.066a.5.5 0 0 1 0 .832z"
		/>
	</svg>
	<svg className="media-pause-icon" ariaHidden="true" viewBox="0 0 24 24">
		<path fill="currentColor" d="M6 5h2v14H6V5zm10 0h2v14h-2V5z" />
	</svg>
</PlayButton>
```

</Docs>
