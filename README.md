# react-snowfall-canvas

A lightweight snowfall overlay for React. It draws on a single `<canvas>`, has no runtime dependencies, and doesn't block clicks on the page underneath.

**[Live demo →](https://neha-pandit.com/snowfall-effect/)**

## Install

```bash
npm install react-snowfall-canvas
```

## Usage

```jsx
import { Snowfall } from "react-snowfall-canvas";

export default function App() {
  return (
    <>
      <Snowfall /> {/* medium snowfall (default) */}
      <YourPage />
    </>
  );
}
```

### Intensity

| `intensity`            | What it looks like                            |
| ---------------------- | --------------------------------------------- |
| `"drizzle"`            | A few small, slow flakes                      |
| `"medium"` _(default)_ | Steady snowfall with a gentle drift           |
| `"storm"`              | Heavy, fast snow blown sideways by gusty wind |

```jsx
<Snowfall intensity="drizzle" />
<Snowfall intensity="storm" />
```

Changing `intensity` while the snow is running blends smoothly into the new mode.

### Props

| Prop                   | Type                               | Default      | Description                                                                 |
| ---------------------- | ---------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `intensity`            | `"drizzle" \| "medium" \| "storm"` | `"medium"`   | How heavy the snow is                                                       |
| `color`                | `string`                           | `"#ffffff"`  | Flake color (any CSS color)                                                 |
| `density`              | `number`                           | preset value | Flakes per 1,000,000 px² of screen. Overrides the `intensity` preset        |
| `maxFlakes`            | `number`                           | preset value | Upper limit on the number of flakes. Overrides the `intensity` preset       |
| `zIndex`               | `number`                           | `9999`       | Stacking order of the overlay                                               |
| `position`             | `"fixed" \| "absolute"`            | `"fixed"`    | `fixed` covers the viewport; `absolute` fills the nearest positioned parent |
| `respectReducedMotion` | `boolean`                          | `true`       | Shows a still frame for users who turned on "reduce motion"                 |
| `className`            | `string`                           | –            | Extra class for the canvas                                                  |
| `style`                | `CSSProperties`                    | –            | Extra inline styles for the canvas                                          |

### Custom density and color

`density` and `maxFlakes` override the values from the chosen `intensity`, while keeping its speed, wind and flake size. The flake count is `density × screen area (in millions of px²)`, capped at `maxFlakes`. If you raise `density` and see no change, raise `maxFlakes` too.

```jsx
<Snowfall intensity="drizzle" density={200} maxFlakes={400} color="#cfe8ff" />
```

### Snow inside one element

```jsx
<div style={{ position: "relative", height: 300 }}>
  <Snowfall position="absolute" intensity="drizzle" />…
</div>
```

### Without React

The canvas engine is exported on its own:

```js
import { SnowEngine } from "react-snowfall-canvas";

const engine = new SnowEngine(canvasElement, { intensity: "storm" });
engine.start();
// engine.setIntensity('drizzle');
// engine.setOverrides({ density: 200, maxFlakes: 400 });
// engine.setColor('#cfe8ff');
// engine.destroy();
```

## Performance

- Uses `requestAnimationFrame` and pauses while the tab is hidden.
- Flake count scales with screen size and is capped per mode.
- Canvas resolution is capped at 2× for high-DPI screens.

## Development

```bash
npm install
npm run demo        # opens the demo at http://localhost:5173
npm run build       # builds the library into dist/
npm run typecheck
```

## License

MIT
