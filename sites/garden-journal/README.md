# Mein Gartenjournal

Interaktive Gartenplanung mit Beeteditor, rasterbasierten Wegen, Pflanz- und Erntekalender sowie einer anpassbaren Kulturbibliothek. Pflanzen und Wege können ausgewählt, gemeinsam verschoben und in gemischten Gruppen organisiert werden. Die Daten werden ausschließlich im Browser gespeichert und können als JSON-Datei exportiert oder importiert werden.

## Entwicklung

Voraussetzung ist Node.js 22 oder neuer.

```bash
npm ci
npm run dev
```

Vor einem Commit müssen Tests und Produktions-Build erfolgreich sein:

```bash
npm run check
```

## Struktur

- `app/page.js`: Anwendungszustand und Zusammensetzung der Benutzeroberfläche
- `app/components/`: wiederverwendbare UI-Komponenten
- `app/lib/garden-data.js`: Kulturdaten und Standardwerte
- `app/lib/garden-utils.js`: reine Domänenfunktionen
- `app/lib/garden-storage.js`: Browser-Persistenz
- `test/`: automatisierte Tests der Domänenlogik
- `scripts/sites-adapter.mjs`: Adapter für die Sites-Laufzeit

## Datenhaltung

Beete, Kulturen, Wege, Gruppen und Einstellungen liegen unter dem Schlüssel `gemuesegarten-v1` im `localStorage`. Das vorhandene Datenformat bleibt bei Aktualisierungen rückwärtskompatibel; ältere Pflanzungen mit Mengenangabe werden beim Laden in einzeln positionierbare Pflanzen und frühere Pflanzengruppen in das gemeinsame Elementmodell überführt.
