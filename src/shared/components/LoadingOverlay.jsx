import bookflowArtwork from "../../assets/bookflow-quill.png";

export function LoadingOverlay({ loading }) {
  const percent = Math.min(100, Math.max(0, Math.round(loading.percent)));

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-card">
        <img className="loading-artwork" src={bookflowArtwork} alt="" />
        <div className="loading-copy">
          <small>Preparing your book</small>
          <h2>{loading.label}</h2>
          <p title={loading.name}>{loading.name}</p>
          {loading.detail && <span>{loading.detail}</span>}
        </div>
        <div
          className="loading-progress"
          role="progressbar"
          aria-label="Book import progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={percent}
        >
          <i style={{ width: `${percent}%` }} />
        </div>
        <span className="loading-percent">{percent}%</span>
      </div>
    </div>
  );
}
