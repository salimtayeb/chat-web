"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../frontend/hooks/useAuth.js";

export default function LoginPage() {
  const router = useRouter();
  const { user, loadingAuth, authError, signUp, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // si déjà connecté -> hub
  useEffect(() => {
    if (!loadingAuth && user) router.push("/hub");
  }, [loadingAuth, user, router]);

  if (loadingAuth) {
    return <p style={{ padding: 20 }}>Chargement…</p>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ fontSize: 34, margin: 0 }}>Connexion</h1>
        <p style={{ opacity: 0.75, marginTop: 8 }}>
          Connecte-toi ou crée un compte.
        </p>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "inherit" }}
          />
          <input
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "inherit" }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => signIn(email, password)}
              style={{ padding: "10px 14px", cursor: "pointer", flex: 1 }}
            >
              Se connecter
            </button>

            <button
              onClick={() => signUp(email, password)}
              style={{ padding: "10px 14px", cursor: "pointer", flex: 1 }}
            >
              S’inscrire
            </button>
          </div>

          {authError ? <p style={{ color: "salmon", marginTop: 6 }}>{authError}</p> : null}

          <a href="/" style={{ opacity: 0.7, fontSize: 13, marginTop: 6 }}>
            ← Retour à l’accueil
          </a>
        </div>
      </div>
    </div>
  );
}
