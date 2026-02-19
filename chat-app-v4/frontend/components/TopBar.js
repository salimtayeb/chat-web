"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth.js";

export default function TopBar({ backHref = "/hub", title = "" }) {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => router.push(backHref)}>← Retour</button>
        {title ? <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div> : null}
      </div>

      <button
        onClick={async () => {
          try {
            await signOut();
          } finally {
            router.push("/login");
          }
        }}
      >
        Déconnexion
      </button>
    </div>
  );
}
