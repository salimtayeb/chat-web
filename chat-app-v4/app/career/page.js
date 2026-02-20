"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../frontend/hooks/useAuth.js";

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

/* ✅ AJOUT : petit bouton stylé (sans casser le reste) */
function MiniButton({ children, onClick, variant = "ghost", type = "button" }) {
  const isDanger = variant === "danger";
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: isDanger
          ? "1px solid rgba(255,120,120,0.35)"
          : "1px solid rgba(255,255,255,0.18)",
        background: isDanger ? "rgba(255, 80, 80, 0.08)" : "rgba(255,255,255,0.10)",
        color: isDanger ? "#ffb4b4" : "white",
        fontWeight: 900,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/* ✅ AJOUT : conversion + resize (carré) => base64 pour PDF (fiable) */
async function fileToResizedDataUrl(file, size = 600, quality = 0.85) {
  const url = URL.createObjectURL(file);

  try {
    const img = new Image();
    img.src = url;

    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = () => reject(new Error("Impossible de charger l'image"));
    });

    // Crop carré centré
    const s = Math.min(img.width, img.height);
    const sx = (img.width - s) / 2;
    const sy = (img.height - s) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas non supporté");

    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CareerPage() {
  const router = useRouter();

  /* ✅ MODIF (sans rien enlever) : on récupère user/loadingAuth pour protéger la page */
  const { user, loadingAuth, signOut } = useAuth();

  /* ✅ AJOUT : protection route (si pas connecté => /login) */
  useEffect(() => {
    if (!loadingAuth && !user) {
      router.replace("/login");
    }
  }, [loadingAuth, user, router]);

  const [form, setForm] = useState({
    name: "salim tayeb",

    /* ✅ AJOUT : infos personnelles */
    birthDate: "",
    city: "",
    email: "",
    phone: "",

    /* ✅ AJOUT : option photo */
    includePhoto: false,
    photoDataUrl: "",

    experience: [{ title: "", company: "", year: "", details: "" }],
    skills: [],
    education: [{ degree: "", school: "", year: "" }],
    targetRole: "",
  });

  const [skillDraft, setSkillDraft] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  /* ✅ AJOUT : état upload photo */
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const missing = useMemo(() => {
    const labels = [];

    // Expérience
    const xpOk =
      Array.isArray(form.experience) &&
      form.experience.length > 0 &&
      form.experience.some(
        (x) =>
          String(x?.title || "").trim() ||
          String(x?.company || "").trim() ||
          String(x?.year || "").trim() ||
          String(x?.details || "").trim()
      );
    if (!xpOk) labels.push("Expérience");

    // Compétences
    const skillsOk = Array.isArray(form.skills) && form.skills.length > 0;
    if (!skillsOk) labels.push("Compétences");

    // Formation
    const eduOk =
      Array.isArray(form.education) &&
      form.education.length > 0 &&
      form.education.some(
        (e) =>
          String(e?.degree || "").trim() ||
          String(e?.school || "").trim() ||
          String(e?.year || "").trim()
      );
    if (!eduOk) labels.push("Formation");

    // Poste visé
    if (!String(form.targetRole || "").trim()) labels.push("Poste visé");

    return labels;
  }, [form]);

  // ===== Skills (blocs / tags) =====
  function addSkill() {
    const v = String(skillDraft || "").trim();
    if (!v) return;

    setForm((p) => {
      const list = Array.isArray(p.skills) ? p.skills : [];
      if (list.some((x) => String(x).toLowerCase() === v.toLowerCase())) return p;
      return { ...p, skills: [...list, v] };
    });
    setSkillDraft("");
  }

  function removeSkill(skill) {
    const s = String(skill || "");
    setForm((p) => ({
      ...p,
      skills: (p.skills || []).filter(
        (x) => String(x).toLowerCase() !== s.toLowerCase()
      ),
    }));
  }

  // ===== Education blocs =====
  function addEducation() {
    setForm((p) => ({
      ...p,
      education: [...(p.education || []), { degree: "", school: "", year: "" }],
    }));
  }

  function removeEducation(index) {
    setForm((p) => ({
      ...p,
      education: (p.education || []).filter((_, i) => i !== index),
    }));
  }

  function updateEducation(index, key, value) {
    setForm((p) => ({
      ...p,
      education: (p.education || []).map((ed, i) =>
        i === index ? { ...ed, [key]: value } : ed
      ),
    }));
  }

  // ===== Experience blocs =====
  function addExperience() {
    setForm((p) => ({
      ...p,
      experience: [
        ...(p.experience || []),
        { title: "", company: "", year: "", details: "" },
      ],
    }));
  }

  function removeExperience(index) {
    setForm((p) => ({
      ...p,
      experience: (p.experience || []).filter((_, i) => i !== index),
    }));
  }

  function updateExperience(index, key, value) {
    setForm((p) => ({
      ...p,
      experience: (p.experience || []).map((ex, i) =>
        i === index ? { ...ex, [key]: value } : ex
      ),
    }));
  }

  /* ✅ AJOUT : gestion photo */
  async function handlePhotoFile(file) {
    setPhotoError("");
    if (!file) return;

    // Sécurité basique
    const isImage = String(file.type || "").startsWith("image/");
    if (!isImage) {
      setPhotoError("Le fichier doit être une image (png/jpg/webp).");
      return;
    }

    // Limite simple (évite base64 énorme)
    const maxMb = 6;
    if (file.size > maxMb * 1024 * 1024) {
      setPhotoError(`Image trop lourde. Max ${maxMb} MB.`);
      return;
    }

    setPhotoLoading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 600, 0.85);
      setForm((p) => ({ ...p, photoDataUrl: dataUrl }));
    } catch (e) {
      setPhotoError("Impossible de traiter l'image.");
    } finally {
      setPhotoLoading(false);
    }
  }

  function clearPhoto() {
    setPhotoError("");
    setForm((p) => ({ ...p, photoDataUrl: "" }));
  }

  /* ✅ AJOUT : déconnexion "réelle" + redirection */
  async function handleLogout() {
    try {
      // ✅ si ton hook supporte redirectTo => parfait
      await Promise.resolve(signOut?.("/login"));
    } catch {
      // même si ça échoue, on tente la redirection
    } finally {
      router.replace("/login");
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

    // payload propre (trim + filtre)
    const payload = {
      name: String(form.name || "").trim(),
      targetRole: String(form.targetRole || "").trim(),

      /* ✅ AJOUT : infos personnelles envoyées au backend */
      birthDate: String(form.birthDate || "").trim(),
      city: String(form.city || "").trim(),
      email: String(form.email || "").trim(),
      phone: String(form.phone || "").trim(),

      /* ✅ AJOUT : photo optionnelle envoyée au backend */
      includePhoto: Boolean(form.includePhoto),
      photoDataUrl: form.includePhoto ? String(form.photoDataUrl || "") : "",

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
    };

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
                <MiniButton onClick={() => router.back()}>Retour</MiniButton>
                <MiniButton variant="danger" onClick={handleLogout}>
                  Déconnexion
                </MiniButton>
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

              {/* ✅ AJOUT : Photo optionnelle (checkbox + upload + preview) */}
              <Field label="Photo" hint="Optionnel">
                <div style={{ display: "grid", gap: 10 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(form.includePhoto)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((p) => ({
                          ...p,
                          includePhoto: checked,
                          // si l'utilisateur décoche => on vide la photo pour éviter une surprise
                          photoDataUrl: checked ? p.photoDataUrl : "",
                        }));
                        setPhotoError("");
                      }}
                      style={{ transform: "scale(1.1)" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 800 }}>
                      Inclure une photo dans le CV
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      (affichée en haut à gauche)
                    </span>
                  </label>

                  {form.includePhoto ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "auto 1fr",
                        alignItems: "center",
                      }}
                    >
                      {/* Preview */}
                      <div
                        style={{
                          width: 88,
                          height: 88,
                          borderRadius: 18,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(0,0,0,0.18)",
                          display: "grid",
                          placeItems: "center",
                        }}
                        title="Aperçu"
                      >
                        {form.photoDataUrl ? (
                          <img
                            src={form.photoDataUrl}
                            alt="Aperçu photo"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              objectPosition: "50% 35%",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: 12, opacity: 0.75, textAlign: "center" }}>
                            Pas de photo
                          </div>
                        )}
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            await handlePhotoFile(f);
                          }}
                          style={{
                            width: "100%",
                            padding: "12px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: "rgba(0,0,0,0.18)",
                            color: "white",
                            outline: "none",
                          }}
                        />

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <MiniButton
                            onClick={() => {
                              // déclencheur simple: l’utilisateur peut re-uploader via input
                              // bouton utile pour supprimer
                              clearPhoto();
                            }}
                            variant="danger"
                          >
                            Supprimer la photo
                          </MiniButton>

                          <div style={{ fontSize: 12, opacity: 0.75, alignSelf: "center" }}>
                            {photoLoading ? "Traitement de l'image…" : "Conseil : photo claire, visage centré."}
                          </div>
                        </div>

                        {photoError ? (
                          <div
                            style={{
                              padding: "10px 12px",
                              borderRadius: 14,
                              border: "1px solid rgba(255,120,120,0.35)",
                              background: "rgba(255, 80, 80, 0.08)",
                              color: "#ffb4b4",
                              fontSize: 13,
                            }}
                          >
                            {photoError}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      Active l’option pour ajouter une photo (elle sera redimensionnée automatiquement).
                    </div>
                  )}
                </div>
              </Field>

              {/* ✅ AJOUT : Infos personnelles */}
              <Field label="Infos personnelles" hint="Optionnel">
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <Input
                      type="date"
                      placeholder="Date de naissance"
                      value={form.birthDate}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, birthDate: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Ville"
                      value={form.city}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <Input
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Téléphone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Ces infos seront utilisées pour le rendu du CV (si ton backend les gère).
                  </div>
                </div>
              </Field>

              {/* ✅ Expérience en blocs (comme v3) */}
              <Field label="Expérience" hint="Obligatoire">
                <div style={{ display: "grid", gap: 10 }}>
                  {(form.experience || []).map((ex, i) => (
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
                          onChange={(e) =>
                            updateExperience(i, "company", e.target.value)
                          }
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
                          disabled={(form.experience || []).length === 1}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,120,120,0.35)",
                            background: "rgba(255, 80, 80, 0.08)",
                            color: "#ffb4b4",
                            fontWeight: 800,
                            cursor:
                              (form.experience || []).length === 1
                                ? "not-allowed"
                                : "pointer",
                            opacity: (form.experience || []).length === 1 ? 0.5 : 1,
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

              {/* ✅ Compétences en tags (comme v3: array + badges) */}
              <Field label="Compétences" hint="Obligatoire">
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(form.skills || []).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => removeSkill(s)}
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
                        addSkill();
                      }}
                    />

                    <button
                      type="button"
                      onClick={addSkill}
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

              {/* ✅ Formation en blocs (comme v3) */}
              <Field label="Formation" hint="Obligatoire">
                <div style={{ display: "grid", gap: 10 }}>
                  {(form.education || []).map((ed, i) => (
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

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 0.5fr",
                          gap: 10,
                        }}
                      >
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
                          disabled={(form.education || []).length === 1}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,120,120,0.35)",
                            background: "rgba(255, 80, 80, 0.08)",
                            color: "#ffb4b4",
                            fontWeight: 800,
                            cursor:
                              (form.education || []).length === 1
                                ? "not-allowed"
                                : "pointer",
                            opacity: (form.education || []).length === 1 ? 0.5 : 1,
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
                  onChange={(e) =>
                    setForm((p) => ({ ...p, targetRole: e.target.value }))
                  }
                />
              </Field>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginTop: 6,
                }}
              >
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
            <div
              style={{
                opacity: 0.75,
                marginTop: 6,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
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