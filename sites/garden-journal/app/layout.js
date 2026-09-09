import "./styles.css";
import { AiNote, HomeButton } from "./components/ai-note.js";

export const metadata = {
  title: "Mein Gemüsegarten",
  description: "Beetplanung, Pflanzkalender und Kulturbibliothek in einer privaten Gartenübersicht.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" data-theme="dark">
      <head>
        <link rel="stylesheet" href="https://pompui.de/shared/pompui-chrome.css" />
      </head>
      <body>
        <AiNote />
        <HomeButton />
        {children}
      </body>
    </html>
  );
}