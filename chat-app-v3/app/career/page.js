"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function Field({ label, hint, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <label style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.2 }}>
          {label}
        </label>
        {hint ? <span style={{ fontSize: 12, opacity: 0.75 }}>{hint}</span> : null}
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
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [form, setForm] = useState({
    name: "salim tayeb",
    // ✅ Expérience en blocs
    experience: [{ title: "", company: "", year: "", details: "" }],
    skills: [],
    education: [{ degree: "", school: "", year: "" }],
    targetRole: "",
  });

  const [skillInput, setSkillInput] = useState("");
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
      .filter(([k]) => {
        if (k === "skills") {
          return !Array.isArray(form.skills) || form.skills.length === 0;
        }

        if (k === "education") {
          if (!Array.isArray(form.education) || form.education.length === 0) return true;
          return !form.education.some(
            (e) =>
              String(e?.degree || "").trim() ||
              String(e?.school || "").trim() ||
              String(e?.year || "").trim()
          );
        }

        if (k === "experience") {
          if (!Array.isArray(form.experience) || form.experience.length === 0) return true;
          return !form.experience.some(
            (x) =>
              String(x?.title || "").trim() ||
              String(x?.company || "").trim() ||
              String(x?.year || "").trim() ||
              String(x?.details || "").trim()
          );
        }

        return !String(form[k] || "").trim();
      })
      .map(([, label]) => label);
  }, [form]);

  function addSkill() {
    const v = skillInput.trim();
    if (!v) return;
    setForm((p) => ({ ...p, skills: [...p.skills, v] }));
    setSkillInput("");
  }

  function removeSkill(index) {
    setForm((p) => ({ ...p, skills: p.skills.filter((_, i) => i !== index) }));
  }

  function addEducation() {
    setForm((p) => ({
      ...p,
      education: [...p.education, { degree: "", school: "", year: "" }],
    }));
  }

  function removeEducation(index) {
    setForm((p) => ({
      ...p,
      education: p.education.filter((_, i) => i !== index),
    }));
  }

  function updateEducation(index, key, value) {
    setForm((p) => ({
      ...p,
      education: p.education.map((ed, i) =>
        i === index ? { ...ed, [key]: value } : ed
      ),
    }));
  }

  // ✅ Experience handlers
  function addExperience() {
    setForm((p) => ({
      ...p,
      experience: [...p.experience, { title: "", company: "", year: "", details: "" }],
    }));
  }

  function removeExperience(index) {
    setForm((p) => ({
      ...p,
      experience: p.experience.filter((_, i) => i !== index),
    }));
  }

  function updateExperience(index, key, value) {
    setForm((p) => ({
      ...p,
      experience: p.experience.map((ex, i) =>
        i === index ? { ...ex, [key]: value } : ex
      ),
    }));
  }

  // ✅ Bouton Retour
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/hub");
    }
  }

  // ✅ Bouton Déconnexion (sans nouveau fichier) : best-effort + redirection
  function clearCookie(name) {
    try {
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`;
    } catch {}
  }

  async function logout() {
    if (logoutLoading) return;

    try {
      setLogoutLoading(true);

      // ✅ Déconnexion côté serveur (si tu ajoutes le handler DELETE sur /api/career)
      // (nécessaire pour supprimer un cookie HttpOnly)
      try {
        await fetch("/api/career", { method: "DELETE" });
      } catch {}

      // Si tu as déjà une route dédiée, on tente aussi (sinon on ignore)
      try {
        await fetch("/api/logout", { method: "POST" });
      } catch {}

      // Nettoyage local
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("auth");
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
      } catch {}

      try {
        sessionStorage.clear();
      } catch {}

      [
        "token",
        "accessToken",
        "auth",
        "session",
        "jwt",
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
        "next-auth.csrf-token",
        "__Host-next-auth.csrf-token",
      ].forEach(clearCookie);
    } finally {
      setLogoutLoading(false);

      // Redirect "hard" pour éviter tout effet type 'retour' (middleware/session)
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      } else {
        router.push("/login");
        router.refresh();
      }
    }
  }

  async function generate() {
    setError("");
    setLoading(true);
    setResult(null);

    if (missing.length) {
      setLoading(false);
      setError(`Champs obligatoires manquants : ${missing.join(", ")}`);
      return;
    }

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skills: (form.skills || []).map((s) => String(s).trim()).filter(Boolean),
          education: (form.education || [])
            .map((e) => ({
              degree: String(e.degree || "").trim(),
              school: String(e.school || "").trim(),
              year: String(e.year || "").trim(),
            }))
            .filter((e) => e.degree || e.school || e.year),
          experience: (form.experience || [])
            .map((x) => ({
              title: String(x.title || "").trim(),
              company: String(x.company || "").trim(),
              year: String(x.year || "").trim(),
              details: String(x.details || "").trim(),
            }))
            .filter((x) => x.title || x.company || x.year || x.details),
        }),
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
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gap: 16 }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 34, letterSpacing: -0.4 }}>
                Générer CV (PDF)
              </h1>
              <p style={{ opacity: 0.85, marginTop: 8, lineHeight: 1.6 }}>
                Remplis ton profil puis clique sur <b>Générer</b>.
              </p>
            </div>

            {/* ✅ Ajout : boutons Retour + Déconnexion (sans changer le bloc Statut) */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                onClick={goBack}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ← Retour
              </button>

              <button
                type="button"
                onClick={logout}
                disabled={logoutLoading}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,120,120,0.35)",
                  background: "rgba(255, 80, 80, 0.08)",
                  color: "#ffb4b4",
                  fontWeight: 900,
                  cursor: logoutLoading ? "not-allowed" : "pointer",
                  opacity: logoutLoading ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {logoutLoading ? "Déconnexion..." : "Déconnexion"}
              </button>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.18)",
                  minWidth: 220,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Statut</div>
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
                </div>
              </div>
            </div>
            {/* ✅ Fin ajout */}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
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

              {/* ✅ Expérience en blocs */}
              <Field label="Expérience" hint="Obligatoire">
                <div style={{ display: "grid", gap: 10 }}>
                  {form.experience.map((ex, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(0,0,0,0.18)",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <Input
                        placeholder="Titre (ex : Stage / Développeur Front)"
                        value={ex.title}
                        onChange={(e) => updateExperience(i, "title", e.target.value)}
                      />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 0.5fr",
                          gap: 10,
                        }}
                      >
                        <Input
                          placeholder="Entreprise / Projet"
                          value={ex.company}
                          onChange={(e) => updateExperience(i, "company", e.target.value)}
                        />
                        <Input
                          placeholder="Année / Période"
                          value={ex.year}
                          onChange={(e) => updateExperience(i, "year", e.target.value)}
                        />
                      </div>

                      <Textarea
                        placeholder="- Missions\n- Réalisations\n- Résultats (chiffres si possible)"
                        value={ex.details}
                        onChange={(e) => updateExperience(i, "details", e.target.value)}
                      />

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => removeExperience(i)}
                          disabled={form.experience.length === 1}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,120,120,0.35)",
                            background: "rgba(255, 80, 80, 0.08)",
                            color: "#ffb4b4",
                            fontWeight: 800,
                            cursor: form.experience.length === 1 ? "not-allowed" : "pointer",
                            opacity: form.experience.length === 1 ? 0.5 : 1,
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addExperience}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    + Ajouter une expérience
                  </button>
                </div>
              </Field>

              <Field label="Compétences" hint="Obligatoire">
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Input
                      placeholder="Ex : React"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.10)",
                        color: "white",
                        fontWeight: 800,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Ajouter
                    </button>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {form.skills.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(0,0,0,0.18)",
                          fontSize: 12,
                        }}
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(i)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "rgba(255,255,255,0.75)",
                            cursor: "pointer",
                            fontWeight: 900,
                            lineHeight: 1,
                          }}
                          title="Supprimer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </Field>

              <Field label="Formation" hint="Obligatoire">
                <div style={{ display: "grid", gap: 10 }}>
                  {form.education.map((ed, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(0,0,0,0.18)",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <Input
                        placeholder="Diplôme (ex : Bac+3 Informatique)"
                        value={ed.degree}
                        onChange={(e) => updateEducation(i, "degree", e.target.value)}
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.5fr", gap: 10 }}>
                        <Input
                          placeholder="École / Organisme"
                          value={ed.school}
                          onChange={(e) => updateEducation(i, "school", e.target.value)}
                        />
                        <Input
                          placeholder="Année"
                          value={ed.year}
                          onChange={(e) => updateEducation(i, "year", e.target.value)}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => removeEducation(i)}
                          disabled={form.education.length === 1}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,120,120,0.35)",
                            background: "rgba(255, 80, 80, 0.08)",
                            color: "#ffb4b4",
                            fontWeight: 800,
                            cursor: form.education.length === 1 ? "not-allowed" : "pointer",
                            opacity: form.education.length === 1 ? 0.5 : 1,
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addEducation}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    + Ajouter un diplôme
                  </button>
                </div>
              </Field>

              <Field label="Poste visé" hint="Obligatoire">
                <Input
                  placeholder="Ex : Ingénieur informatique"
                  value={form.targetRole}
                  onChange={(e) => setForm((p) => ({ ...p, targetRole: e.target.value }))}
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
                  En cliquant, tu acceptes que le contenu soit envoyé au moteur IA.
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
            <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: 0.3 }}>Résultat</div>
            <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
              Après génération, tu pourras télécharger ton PDF.
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
                <a href={`/api/career/pdf?id=${result.id}`} target="_blank" rel="noreferrer">
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
              </div>
            )}
          </div>
        </div>

        <div style={{ opacity: 0.65, fontSize: 12, textAlign: "center", marginTop: 6 }}>
          Astuce : sur mobile, pense à scroller.
        </div>
      </div>
    </div>
  );
}