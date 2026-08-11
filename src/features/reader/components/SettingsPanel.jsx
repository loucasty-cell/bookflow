import { Moon, Settings2, Sun, X } from 'lucide-react'

export function SettingsPanel({ settings, setSettings, open, close }) {
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }))

  return (
    <aside className={`settings-popover ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="panel-heading">
        <span><Settings2 size={16} /> Reading space</span>
        <button className="icon-button" onClick={close} aria-label="Close settings"><X size={18} /></button>
      </div>
      <div className="setting-group">
        <label>Atmosphere</label>
        <div className="segmented">
          <button className={settings.theme === 'paper' ? 'active' : ''} onClick={() => update('theme', 'paper')}><Sun size={15} /> Paper</button>
          <button className={settings.theme === 'dusk' ? 'active' : ''} onClick={() => update('theme', 'dusk')}><Moon size={15} /> Dusk</button>
        </div>
      </div>
      <div className="setting-group">
        <label htmlFor="font-size">Text size <b>{settings.fontSize}px</b></label>
        <input id="font-size" type="range" min="17" max="25" value={settings.fontSize} onChange={(event) => update('fontSize', Number(event.target.value))} />
      </div>
      <div className="setting-group">
        <label htmlFor="line-height">Line space <b>{settings.lineHeight.toFixed(1)}</b></label>
        <input id="line-height" type="range" min="1.5" max="2.2" step="0.1" value={settings.lineHeight} onChange={(event) => update('lineHeight', Number(event.target.value))} />
      </div>
      <div className="setting-group">
        <label htmlFor="column-width">Page width <b>{settings.columnWidth}px</b></label>
        <input id="column-width" type="range" min="580" max="820" step="20" value={settings.columnWidth} onChange={(event) => update('columnWidth', Number(event.target.value))} />
      </div>
      <div className="setting-group">
        <label>Sentence focus</label>
        <div className="focus-options">
          {['off', 'soft', 'deep'].map((option) => (
            <button key={option} className={settings.focus === option ? 'active' : ''} onClick={() => update('focus', option)}>{option}</button>
          ))}
        </div>
        <p>Soft keeps nearby text present. Deep creates a quieter reading tunnel.</p>
      </div>
    </aside>
  )
}
