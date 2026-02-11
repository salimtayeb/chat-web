"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../frontend/hooks/useAuth.js";

export default function LoginPage() {
  const router = useRouter();
  const { user, loadingAuth, authError, signUp, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loadingAuth && user) {
      router.push("/");
    }
  }, [loadingAuth, user, router]);

  if (loadingAuth) {
    return <p style={{ padding: 20 }}>Chargement…</p>;
  }

  // Si connecté, on affiche un petit état pendant la redirection
  if (user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Connecté</h2>
        <p>{user.email}</p>
        <button onClick={signOut}>Se déconnecter</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 400 }}>
      <h2>Connexion / Inscription</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => signIn(email, password)}>Se connecter</button>
        <button onClick={() => signUp(email, password)}>S’inscrire</button>
      </div>

      {authError && <p style={{ color: "red" }}>{authError}</p>}
    </div>
  );
}
