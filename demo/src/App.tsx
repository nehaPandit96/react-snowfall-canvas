import { useEffect, useState } from "react";
import { PRESETS, Snowfall, type SnowIntensity } from "react-snowfall-canvas";

const DEFAULT_COLOR = "#ffffff";

/** Screen area in millions of px², the unit `density` is measured in. */
function useScreenArea() {
  const read = () => (window.innerWidth * window.innerHeight) / 1_000_000;
  const [area, setArea] = useState(read);
  useEffect(() => {
    const onResize = () => setArea(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return area;
}

const MODES: { value: SnowIntensity; label: string; hint: string }[] = [
  { value: "drizzle", label: "Drizzle", hint: "Light, slow flakes" },
  { value: "medium", label: "Medium", hint: "Steady snowfall (default)" },
  { value: "storm", label: "Windy storm", hint: "Heavy, fast, gusty" },
];

export function App() {
  const [intensity, setIntensity] = useState<SnowIntensity>("medium");
  const [enabled, setEnabled] = useState(true);
  const [density, setDensity] = useState(PRESETS.medium.density);
  const [maxFlakes, setMaxFlakes] = useState(PRESETS.medium.maxFlakes);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const area = useScreenArea();

  // Picking a mode loads that mode's density and cap into the sliders.
  const chooseMode = (mode: SnowIntensity) => {
    setIntensity(mode);
    setDensity(PRESETS[mode].density);
    setMaxFlakes(PRESETS[mode].maxFlakes);
  };

  const preset = PRESETS[intensity];
  const wanted = Math.round(density * area);
  const flakeCount = Math.min(maxFlakes, wanted);
  const capped = wanted > maxFlakes;

  // Only show props in the usage snippet that differ from the defaults.
  const extraProps = [
    density !== preset.density && `density={${density}}`,
    maxFlakes !== preset.maxFlakes && `maxFlakes={${maxFlakes}}`,
    color !== DEFAULT_COLOR && `color="${color}"`,
  ].filter(Boolean);
  const snippet =
    extraProps.length === 0
      ? `<Snowfall intensity="${intensity}" />`
      : `<Snowfall\n  intensity="${intensity}"\n${extraProps.map((p) => `  ${p}`).join("\n")}\n/>`;

  return (
    <>
      {enabled && (
        <Snowfall
          intensity={intensity}
          density={density}
          maxFlakes={maxFlakes}
          color={color}
        />
      )}

      <main className="page">
        <header>
          <h1>react-snowfall-canvas</h1>
          <p className="lead">A light snowfall overlay for any React page.</p>
        </header>

        <section className="controls" aria-label="Snow intensity">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={m.value === intensity ? "mode active" : "mode"}
              onClick={() => chooseMode(m.value)}
              aria-pressed={m.value === intensity}
            >
              <span className="mode-label">{m.label}</span>
              <span className="mode-hint">{m.hint}</span>
            </button>
          ))}
        </section>

        <label className="toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Show snow
        </label>

        <section className="card tuning" aria-label="Fine-tune the snow">
          <h2>Fine-tune</h2>

          <label className="field">
            <span className="field-head">
              <span>Density</span>
              <output>{density}</output>
            </span>
            <input
              type="range"
              min={0}
              max={600}
              step={5}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
            />
            <span className="field-hint">
              Flakes per 1,000,000 px² of screen
            </span>
          </label>

          <label className="field">
            <span className="field-head">
              <span>Max flakes</span>
              <output>{maxFlakes}</output>
            </span>
            <input
              type="range"
              min={0}
              max={1500}
              step={10}
              value={maxFlakes}
              onChange={(e) => setMaxFlakes(Number(e.target.value))}
            />
            <span className="field-hint">
              Upper limit, whatever the screen size
            </span>
          </label>

          <label className="field color-field">
            <span className="field-head">
              <span>Color</span>
              <output>{color}</output>
            </span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>

          <p className="flake-count">
            On this screen: <strong>{flakeCount}</strong> flakes
            {capped && (
              <span className="capped">
                {" "}
                · limited by max flakes (density alone would give {wanted})
              </span>
            )}
          </p>

          <button
            className="reset"
            onClick={() => {
              chooseMode(intensity);
              setColor(DEFAULT_COLOR);
            }}
          >
            Reset to preset
          </button>
        </section>

        <section className="card">
          <h2>Usage</h2>
          <pre>
            <code>{`import { Snowfall } from 'react-snowfall-canvas';

${snippet}`}</code>
          </pre>
        </section>

        <section className="card">
          <h2>The page still works</h2>
          <p>
            The snow sits on top of the page but ignores the mouse, so you can
            still click buttons, select text and fill in forms underneath it.
          </p>
          <input className="text" placeholder="Try typing here…" />
        </section>

        <footer>Scroll down — the snow stays fixed to the screen.</footer>
        <div style={{ height: "60vh" }} />
      </main>
    </>
  );
}
