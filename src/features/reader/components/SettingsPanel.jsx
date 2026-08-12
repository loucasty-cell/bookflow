import {
  BookOpen,
  BookOpenText,
  Moon,
  Palette,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "../config.js";

export function SettingsPanel({ settings, setSettings, open, close }) {
  const update = (key, value) =>
    setSettings((current) => ({ ...current, [key]: value }));

  return (
    <aside
      className={`settings-popover ${open ? "is-open" : ""}`}
      aria-hidden={!open}
      aria-label="Reading settings"
      inert={open ? undefined : ""}
    >
      <div className="panel-heading">
        <span>
          <Settings2 size={16} /> Reading space
        </span>
        <button className="icon-button" onClick={close} aria-label="Close settings">
          <X size={18} />
        </button>
      </div>

      <div className="settings-scroll">
        <section className="setting-group">
          <label>Reading mode</label>
          <div className="segmented" role="group" aria-label="Reading mode">
            <button
              className={settings.mode === "focus" ? "active" : ""}
              onClick={() => update("mode", "focus")}
              aria-pressed={settings.mode === "focus"}
            >
              <BookOpen size={15} /> Focus
            </button>
            <button
              className={settings.mode === "normal" ? "active" : ""}
              onClick={() => update("mode", "normal")}
              aria-pressed={settings.mode === "normal"}
            >
              <BookOpenText size={15} /> Normal
            </button>
          </div>
          <p>Focus moves one paragraph at a time. Normal keeps native scrolling.</p>
        </section>

        <section className="setting-group">
          <label>Atmosphere</label>
          <div className="segmented" role="group" aria-label="Reading atmosphere">
            <button
              className={settings.theme === "paper" ? "active" : ""}
              onClick={() => update("theme", "paper")}
              aria-pressed={settings.theme === "paper"}
            >
              <Sun size={15} /> Light
            </button>
            <button
              className={settings.theme === "dusk" ? "active" : ""}
              onClick={() => update("theme", "dusk")}
              aria-pressed={settings.theme === "dusk"}
            >
              <Moon size={15} /> Black
            </button>
            <button
              className={settings.theme === "remix" ? "active" : ""}
              onClick={() => update("theme", "remix")}
              aria-pressed={settings.theme === "remix"}
            >
              <Palette size={15} /> Tint
            </button>
          </div>
        </section>

        <section className="setting-group setting-range-group">
          <label htmlFor="font-size">
            Text size <b>{settings.fontSize}px</b>
          </label>
          <input
            id="font-size"
            type="range"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            value={settings.fontSize}
            onChange={(event) => update("fontSize", Number(event.target.value))}
          />
        </section>

        <section className="setting-group setting-range-group">
          <label htmlFor="line-height">
            Line space <b>{settings.lineHeight.toFixed(1)}</b>
          </label>
          <input
            id="line-height"
            type="range"
            min="1.5"
            max="2.2"
            step="0.1"
            value={settings.lineHeight}
            onChange={(event) => update("lineHeight", Number(event.target.value))}
          />
        </section>

        <section className="setting-group setting-range-group">
          <label htmlFor="column-width">
            Page width <b>{settings.columnWidth}px</b>
          </label>
          <input
            id="column-width"
            type="range"
            min="720"
            max="1120"
            step="20"
            value={settings.columnWidth}
            onChange={(event) => update("columnWidth", Number(event.target.value))}
          />
        </section>

        <section className="setting-group setting-range-group">
          <label htmlFor="focus-pace">
            Paragraph pace <b>{settings.focusPace}ms</b>
          </label>
          <input
            id="focus-pace"
            type="range"
            min="180"
            max="420"
            step="20"
            value={settings.focusPace}
            onChange={(event) => update("focusPace", Number(event.target.value))}
          />
          <p>Sets the calm minimum between controlled paragraph changes.</p>
        </section>

        <section className="setting-group">
          <label>Focus depth</label>
          <div className="focus-options" role="group" aria-label="Paragraph focus depth">
            {["off", "soft", "deep"].map((option) => (
              <button
                key={option}
                className={settings.focus === option ? "active" : ""}
                onClick={() => update("focus", option)}
                aria-pressed={settings.focus === option}
              >
                {option}
              </button>
            ))}
          </div>
          <p>Soft keeps context present. Deep creates a quieter reading tunnel.</p>
        </section>
      </div>
    </aside>
  );
}
