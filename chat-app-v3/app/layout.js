import "../frontend/styles/globals.css";

export const metadata = {
  title: "Chat Web v2",
  description: "Chat avec Supabase Auth + RLS + IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
