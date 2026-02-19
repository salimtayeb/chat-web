"use client";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 820 }}>
        <h1 style={{ fontSize: 52, margin: 0, letterSpacing: -1 }}>Chat Web</h1>
        <p style={{ opacity: 0.85, lineHeight: 1.6, marginTop: 14, fontSize: 16 }}>
          Discute avec l’IA et génère tes documents (CV + lettre) en PDF.
        </p>

        <div style={{ marginTop: 22 }}>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            Se connecter / S’inscrire
          </a>
        </div>

        <p style={{ marginTop: 14, opacity: 0.65, fontSize: 13 }}>
          Après connexion, tu accéderas à une page avec 2 choix : Chat ou Générer un PDF.
        </p>
      </div>
    </div>
  );
}
