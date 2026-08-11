export function LoadingOverlay({ loading }) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-card">
        <div className="page-loader"><span /><span /><span /></div>
        <div>
          <small>Preparing your book</small>
          <h2>{loading.label}</h2>
          <p>{loading.name}</p>
        </div>
        <div className="loading-progress"><i style={{ width: `${Math.max(8, loading.percent)}%` }} /></div>
        <span className="loading-percent">{loading.percent}%</span>
      </div>
    </div>
  )
}
