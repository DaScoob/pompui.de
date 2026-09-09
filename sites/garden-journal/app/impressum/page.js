import { PageHeader } from "../components/page-header.js";

export const metadata = {
  title: "Impressum – Mein Gartenjournal",
  description: "Impressum und Anbieterkennzeichnung gemäß § 5 DDG.",
  robots: { index: false, follow: true },
};

export default function ImpressumPage() {
  return (
    <main className="impressum">
      <PageHeader title="Impressum" subtitle="Angaben gemäß § 5 DDG" backHref="/" backLabel="Zurück zum Gartenjournal" />

      <section>
        <h2>Anbieter</h2>
        <address>
          <strong>Daniel Hettich</strong>
          <br />
          c/o Impressumservice Dein-Impressum, Stettiner Str. 41
          <br />
          35410 Hungen
          <br />
          Deutschland
        </address>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:info@daniel-hettich.de">info@daniel-hettich.de</a>
        </p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>Daniel Hettich, Anschrift wie oben.</p>
      </section>

      <section>
        <h2>EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>
      </section>

      <section>
        <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </section>

      <section>
        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
          rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen
          Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
          Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
        </p>
      </section>

      <section>
        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese
          fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige
          Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne
          konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend
          entfernen.
        </p>
      </section>

      <section>
        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die
          Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
          Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten und nicht kommerziellen
          Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet.
          Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden,
          bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
        </p>
      </section>

      <section>
        <h2>Datenhinweis</h2>
        <p>
          Diese Anwendung speichert Ihre Garten-Daten ausschließlich lokal in Ihrem Browser (Local Storage). Es werden keine Daten an Server
          übertragen.
        </p>
      </section>

      <section>
        <h2>Hosted by</h2>
        <p>
          IONOS SE
          <br />
          Elgendorfer Str. 57
          <br />
          66482 Zweibrücken
        </p>
      </section>
    </main>
  );
}