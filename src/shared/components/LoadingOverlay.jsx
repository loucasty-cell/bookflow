import bookflowArtwork from "../../assets/bookflow-quill.png";

export function LoadingOverlay({ loading }) {
  const rawPercent = typeof loading?.percent === "number" && !isNaN(loading.percent)
    ? loading.percent
    : 1;
  const percent = Math.min(100, Math.max(1, Math.round(rawPercent)));

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-card">
        <img className="loading-artwork" src={bookflowArtwork} alt="" />
        <div className="loading-copy">
          <small>Preparing your book</small>
          <h2>{loading?.label || "Preparing your book"}</h2>
          <p title={loading?.name}>{loading?.name}</p>
          {loading?.detail && <span>{loading.detail}</span>}
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
