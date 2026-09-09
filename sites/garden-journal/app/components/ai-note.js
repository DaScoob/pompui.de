export function AiNote() {
  return (
    <a
      className="ai-note pompui-chrome__ai-note"
      href="https://pompui.de/datenschutz"
      title="Diese Seite wurde mit Unterstützung von KI erstellt"
      aria-label="Hinweis: Diese Seite wurde mit Unterstützung von KI erstellt. Zur Datenschutzerklärung."
    >
      ✳ Mit KI erstellt
    </a>
  );
}

export function HomeButton() {
  return (
    <a
      className="pompui-chrome__home"
      href="https://pompui.de/"
      title="Zurück zur POMPUI Startseite"
      aria-label="Zurück zur POMPUI Startseite"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 11.5 12 4l9 7.5M6 10v10h12V10" />
      </svg>
      <span className="pompui-chrome__home-label">Home</span>
    </a>
  );
}