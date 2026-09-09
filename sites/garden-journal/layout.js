import "./styles.css";

export const metadata = {
  title: "Mein Gemüsegarten",
  description: "Beetplanung, Pflanzkalender und Kulturbibliothek in einer privaten Gartenübersicht.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
