"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../frontend/hooks/useAuth.js";

function Card({ title, subtitle, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? onClick() : null)}
      style={{
        padding: "18px 16px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.15)",
        cursor: "pointer",
        userSelect: "none",
        flex: 1,
        minWidth: 240,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
      <div style={{ opacity: 0.75, marginTop: 6 }}>{subtitle}</div>
    </div>
  );
}

export default function HubPage() {
  const router = useRouter();
  const { user, loadingAuth, signOut } = useAuth();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push("/login");
    }
  }, [loadingAuth, user, router]);

  if (loadingAuth || !user) return null;

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Bienvenue 👋</h1>
          <p>Connecté : {user.email}</p>
        </div>
        <button onClick={signOut}>Déconnexion</button>
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
        <Card
          title="Accéder au chat"
          subtitle="Discuter avec l'IA."
          onClick={() => router.push("/chat")}
        />

        <Card
          title="Générer un PDF"
          subtitle="CV + lettre + suggestions."
          onClick={() => router.push("/career")}
        />

        <Card
          title="Générer un quiz"
          subtitle="À partir d’une offre d’emploi."
          onClick={() => router.push("/quiz")}
        />
      </div>
    </div>
  );
}
