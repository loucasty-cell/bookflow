import bookflowArtwork from "../../assets/bookflow-quill.png";

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <span>
        <img src={bookflowArtwork} alt="" />
      </span>
      <strong>bookflow</strong>
    </div>
  );
}
