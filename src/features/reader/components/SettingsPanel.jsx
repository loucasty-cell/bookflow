import {
  BookOpen,
  BookOpenText,
  Moon,
  Palette,
  Settings2,
  Sun,
  X,
} from "lucide-react";

export function SettingsPanel({ settings, setSettings, open, close }) {
  const update = (key, value) =>
    setSettings((current) => ({ ...current, [key]: value }));

  return (
    <aside
      className={`settings-popover ${open ? "is-open" : ""}`}
      aria-hidden={!open}
    >
      <div className="panel-heading">
        <span>
          <Settings2 size={16} /> Reading space
        </span>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close settings"
        >
          <X size={18} />
        </button>
      </div>
      <div className="setting-group">
        <label>Reading mode</label>
        <div className="segmented">
          <button
            className={settings.mode === "focus" ? "active" : ""}
            onClick={() => update("mode", "focus")}
          >
            <BookOpen size={15} /> Focus
          </button>
          <button
            className={settings.mode === "normal" ? "active" : ""}
            onClick={() => update("mode", "normal")}
          >
            <BookOpenText size={15} /> Normal
          </button>
        </div>
        <p>
          Focus keeps one small paragraph at the reading rail. Normal leaves the
          page in native scroll.
        </p>
      </div>
      <div className="setting-group">
        <label>Atmosphere</label>
        <div className="segmented">
          <button
            className={settings.theme === "paper" ? "active" : ""}
            onClick={() => update("theme", "paper")}
          >
            <Sun size={15} /> Paper
          </button>
          <button
            className={settings.theme === "dusk" ? "active" : ""}
            onClick={() => update("theme", "dusk")}
          >
            <Moon size={15} /> Dusk
          </button>
          <button
            className={settings.theme === "remix" ? "active" : ""}
            onClick={() => update("theme", "remix")}
          >
            <Palette size={15} /> Remix
          </button>
        </div>
      </div>
      <div className="setting-group">
        <label htmlFor="font-size">
          Text size <b>{settings.fontSize}px</b>
        </label>
        <input
          id="font-size"
          type="range"
          min="17"
          max="25"
          value={settings.fontSize}
          onChange={(event) => update("fontSize", Number(event.target.value))}
        />
      </div>
      <div className="setting-group">
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
      </div>
      <div className="setting-group">
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
          onChange={(event) =>
            update("columnWidth", Number(event.target.value))
          }
        />
      </div>
      <div className="setting-group">
        <label htmlFor="focus-pace">
          Paragraph cooldown <b>{settings.focusPace}ms</b>
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
        <p>
          Small wheel movements build intent. This sets the calm minimum between
          paragraph changes.
        </p>
      </div>
      <div className="setting-group">
        <label>Paragraph focus</label>
        <div className="focus-options">
          {["off", "soft", "deep"].map((option) => (
            <button
              key={option}
              className={settings.focus === option ? "active" : ""}
              onClick={() => update("focus", option)}
            >
              {option}
            </button>
          ))}
        </div>
        <p>
          Soft keeps nearby paragraphs present. Deep creates a quieter reading
          tunnel.
        </p>
      </div>
    </aside>
  );
}
