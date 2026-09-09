import "./styles.css";

export const metadata = {
  title: "Mein Gemüsegarten",
  description: "Beetplanung, Pflanzkalender und Kulturbibliothek in einer privaten Gartenübersicht.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
