import "../frontend/styles/globals.css";

export const metadata = {
  title: "Chat Web",
  description: "Chat simple avec Next.js + SQLite + Prisma + Groq",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
