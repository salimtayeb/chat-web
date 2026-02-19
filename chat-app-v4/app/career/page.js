"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../frontend/hooks/useAuth.js";

function Field({ label, hint, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <label style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.2 }}>
          {label}
        </label>
        {hint ? (
          <span style={{ fontSize: 12, opacity: 0.75 }}>{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.18)",
        color: "white",
        outline: "none",
        boxShadow: "0 0 0 0 rgba(124,92,255,0)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = "1px solid rgba(124,92,255,0.7)";
        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(124,92,255,0.18)";
        props?.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.18)";
        e.currentTarget.style.boxShadow = "0 0 0 0 rgba(124,92,255,0)";
        props?.onBlur?.(e);
      }}
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        minHeight: 110,
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.18)",
        color: "white",
        outline: "none",
        resize: "vertical",
        lineHeight: 1.5,
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = "1px solid rgba(124,92,255,0.7)";
        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(124,92,255,0.18)";
        props?.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.18)";
        e.currentTarget.style.boxShadow = "0 0 0 0 rgba(124,92,255,0)";
        props?.onBlur?.(e);
      }}
    />
  );
}

export default function CareerPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [form, setForm] = useState({
    name: "salim tayeb",
    experience: "",
    skills: "",
    education: "",
    targetRole: "",
  });

  const [skillDraft, setSkillDraft] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const missing = useMemo(() => {
    const req = [
      ["experience", "Expérience"],
      ["skills", "Compétences"],
      ["education", "Formation"],
      ["targetRole", "Poste visé"],
    ];
    return req
      .filter(([k]) => !String(form[k] || "").trim())
      .map(([, label]) => label);
  }, [form]);

  async function generate() {
    setError("");
    setLoading(true);
    setResult(null);

    // validation UI (en FR)
    if (missing.length) {
      setLoading(false);
      setError(`Champs obligatoires manquants : ${missing.join(", ")}`);
      return;
    }

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erreur génération");
        return;
      }

      setResult(data);
    } catch (e) {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 22 }}>
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 18px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12))",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 34, letterSpacing: -0.4 }}>
                Générer CV / Lettre (PDF)
              </h1>
              <p style={{ opacity: 0.85, marginTop: 8, lineHeight: 1.6 }}>
                Remplis ton profil puis clique sur <b>Générer</b>. Tu pourras ensuite
                télécharger un PDF propre (CV + lettre + suggestions).
              </p>
            </div>

            {/* ✅ Boutons ajoutés + bloc Statut regroupé à droite */}
            <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => router.back()}>Retour</button>
                <button onClick={signOut}>Déconnexion</button>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.18)",
                  minWidth: 220,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                  Statut
                </div>
                <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  <div>
                    {missing.length ? (
                      <span style={{ color: "#ffb4b4" }}>
                        {missing.length} champ(s) manquant(s)
                      </span>
                    ) : (
                      <span style={{ color: "#b9ffcf" }}>Prêt à générer ✅</span>
                    )}
                  </div>
                  <div style={{ opacity: 0.75 }}>
                    Conseil : mets des phrases courtes et factuelles.
                  </div>
                </div>
              </div>
            </div>
            {/* ✅ fin ajout */}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 16,
          }}
        >
          {/* Form card */}
          <div
            style={{
              padding: "18px 18px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.12)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <Field label="Nom et prénom" hint="Optionnel">
                <Input
                  placeholder="Ex : Salim Tayeb"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </Field>

              <Field label="Expérience" hint="Obligatoire">
                <Textarea
                  placeholder="Ex : Stage, projets, jobs… (missions + résultats)"
                  value={form.experience}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, experience: e.target.value }))
                  }
                />
              </Field>

              <Field label="Compétences" hint="Obligatoire">
  <div style={{ display: "grid", gap: 10 }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {String(form.skills || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              const next = String(form.skills || "")
                .split(",")
                .map((x) => x.trim())
                .filter((x) => x && x.toLowerCase() !== s.toLowerCase())
                .join(", ");
              setForm((p) => ({ ...p, skills: next }));
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.22)",
              color: "white",
              cursor: "pointer",
              fontSize: 13,
            }}
            title="Cliquer pour retirer"
          >
            {s} ✕
          </button>
        ))}
    </div>

    <div style={{ display: "flex", gap: 10 }}>
      <Input
        placeholder="Ex : HTML, CSS, JS, React… (Entrée pour ajouter)"
        value={skillDraft}
        onChange={(e) => setSkillDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const v = String(skillDraft || "").trim();
          if (!v) return;
          const list = String(form.skills || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
          if (list.some((x) => x.toLowerCase() === v.toLowerCase())) {
            setSkillDraft("");
            return;
          }
          const next = [...list, v].join(", ");
          setForm((p) => ({ ...p, skills: next }));
          setSkillDraft("");
        }}
      />

      <button
        type="button"
        onClick={() => {
          const v = String(skillDraft || "").trim();
          if (!v) return;
          const list = String(form.skills || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
          if (list.some((x) => x.toLowerCase() === v.toLowerCase())) {
            setSkillDraft("");
            return;
          }
          const next = [...list, v].join(", ");
          setForm((p) => ({ ...p, skills: next }));
          setSkillDraft("");
        }}
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.10)",
          color: "white",
          fontWeight: 800,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Ajouter
      </button>
    </div>

    <div style={{ fontSize: 12, opacity: 0.75 }}>
      Astuce : clique sur un tag pour le retirer.
    </div>
  </div>
</Field>

              <Field label="Formation" hint="Obligatoire">
                <Input
                  placeholder="Ex : Bac+3 Informatique…"
                  value={form.education}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, education: e.target.value }))
                  }
                />
              </Field>

              <Field label="Poste visé" hint="Obligatoire">
                <Input
                  placeholder="Ex : Ingénieur informatique"
                  value={form.targetRole}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, targetRole: e.target.value }))
                  }
                />
              </Field>

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
                <button
                  onClick={generate}
                  disabled={loading}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background:
                      "linear-gradient(135deg, rgba(124,92,255,0.95), rgba(72,160,255,0.9))",
                    color: "white",
                    fontWeight: 800,
                    cursor: loading ? "not-allowed" : "pointer",
                    minWidth: 160,
                    boxShadow: "0 14px 30px rgba(124,92,255,0.25)",
                  }}
                >
                  {loading ? "Génération..." : "Générer"}
                </button>

                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
                  En cliquant, tu acceptes que le contenu soit envoyé au moteur IA
                  pour générer tes documents.
                </div>
              </div>

              {error ? (
                <div
                  style={{
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,120,120,0.35)",
                    background: "rgba(255, 80, 80, 0.08)",
                    color: "#ffb4b4",
                  }}
                >
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          {/* Result card */}
          <div
            style={{
              padding: "18px 18px",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.12)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              minHeight: 240,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: 0.3 }}>
              Résultat
            </div>
            <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
              Après génération, tu pourras télécharger ton PDF et consulter les textes.
            </div>

            {!result ? (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px dashed rgba(255,255,255,0.18)",
                  opacity: 0.85,
                  fontSize: 13,
                }}
              >
                Rien à afficher pour le moment.
              </div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <a
                  href={`/api/career/pdf?id=${result.id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <button
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Télécharger le PDF
                  </button>
                </a>

                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: "pointer" }}>Voir CV (texte)</summary>
                  <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9, fontSize: 13 }}>
                    {result.cv}
                  </pre>
                </details>

                <details>
                  <summary style={{ cursor: "pointer" }}>Voir Lettre (texte)</summary>
                  <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9, fontSize: 13 }}>
                    {result.coverLetter}
                  </pre>
                </details>

                <details>
                  <summary style={{ cursor: "pointer" }}>Voir Suggestions</summary>
                  <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9, fontSize: 13 }}>
                    {result.suggestions}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Mobile note */}
        <div style={{ opacity: 0.65, fontSize: 12, textAlign: "center", marginTop: 6 }}>
          Astuce : sur mobile, pense à scroller — le PDF est généré côté serveur.
        </div>
      </div>
    </div>
  );
}
