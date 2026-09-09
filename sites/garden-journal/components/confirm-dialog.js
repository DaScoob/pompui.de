export function ConfirmDialog({ request, onCancel, onConfirm }) {
  if (!request) return null;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <span className="confirm-symbol" aria-hidden="true">!</span>
        <div>
          <span className="section-kicker">Sicherheitsabfrage</span>
          <h2 id="confirm-title">{request.title}</h2>
          <p id="confirm-message">{request.message}</p>
        </div>
        <div className="confirm-actions">
          <button type="button" className="button ghost" autoFocus onClick={onCancel}>Abbrechen</button>
          <button type="button" className="button danger-button" onClick={onConfirm}>Endgültig löschen</button>
        </div>
      </section>
    </div>
  );
}
