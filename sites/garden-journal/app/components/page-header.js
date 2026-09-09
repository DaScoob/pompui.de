export function PageHeader({ title, subtitle, backHref, backLabel }) {
  return (
    <header className="impressum-header">
      <nav aria-label="Zurück-Navigation">
        <a href={backHref}>&larr; {backLabel}</a>
      </nav>
      <div className="impressum-heading">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
}