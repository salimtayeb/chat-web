import prisma from "../../../backend/lib/prisma.js";
import { getGroqReply } from "../../../backend/services/groqService.js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(msg) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function safeJsonParse(v) {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t) return null;
  if (!(t.startsWith("[") || t.startsWith("{"))) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function normalizeSkills(raw) {
  const parsed = safeJsonParse(raw);

  // 1) JSON array
  if (Array.isArray(parsed)) {
    return parsed
      .map((x) => (typeof x === "string" ? x : x?.name ?? x?.label ?? ""))
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  // 2) array direct
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean).slice(0, 24);
  }

  // 3) fallback legacy string
  return String(raw || "")
    .split(/[,;\n]/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeEducation(raw) {
  const parsed = safeJsonParse(raw);
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(raw) ? raw : null;

  // 1) array (JSON ou direct)
  if (arr) {
    return arr
      .map((e) => ({
        degree: String(e?.degree || "").trim(),
        school: String(e?.school || "").trim(),
        year: String(e?.year || "").trim(),
      }))
      .filter((e) => e.degree || e.school || e.year)
      .slice(0, 12);
  }

  // 2) fallback legacy string
  const txt = String(raw || "").trim();
  if (!txt) return [];

  const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [{ degree: txt, school: "", year: "" }];
  return lines.slice(0, 12).map((l) => ({ degree: l, school: "", year: "" }));
}

/* ===========================
   ✅ AJOUT : Experience en blocs
   attendu: [{ title, company, year, details }]
   support aussi legacy string
=========================== */
function normalizeExperience(raw) {
  const parsed = safeJsonParse(raw);
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(raw) ? raw : null;

  // 1) array (JSON ou direct)
  if (arr) {
    return arr
      .map((e) => ({
        title: String(e?.title || "").trim(),
        company: String(e?.company || "").trim(),
        year: String(e?.year || "").trim(),
        details: String(e?.details || "").trim(),
      }))
      .filter((e) => e.title || e.company || e.year || e.details)
      .slice(0, 12);
  }

  // 2) fallback legacy string -> blocs séparés par lignes vides
  const txt = String(raw || "").trim();
  if (!txt) return [];

  const blocks = txt
    .split(/\n\s*\n/g) // ligne vide = nouveau bloc
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 12);

  return blocks.map((b) => {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines[0] || "";
    const details = lines.slice(1).join("\n");

    // formats acceptés:
    // "Stage | Open IT | 2025"
    // "Stage - Open IT - 2025"
    let title = head;
    let company = "";
    let year = "";

    if (head.includes("|")) {
      const parts = head.split("|").map((x) => x.trim()).filter(Boolean);
      title = parts[0] || head;
      company = parts[1] || "";
      year = parts[2] || "";
    } else if (head.includes(" - ")) {
      const parts = head.split(" - ").map((x) => x.trim()).filter(Boolean);
      title = parts[0] || head;
      company = parts[1] || "";
      year = parts[2] || "";
    }

    return { title, company, year, details: String(details || "").trim() };
  });
}

function experienceToText(experiences = []) {
  if (!Array.isArray(experiences) || experiences.length === 0) return "";
  return experiences
    .slice(0, 12)
    .map((e) => {
      const head = [e.title, e.company, e.year].filter(Boolean).join(" • ");
      const d = String(e.details || "").trim();
      return d ? `${head}\n${d}` : head;
    })
    .filter(Boolean)
    .join("\n\n");
}

// parfois l'IA renvoie ```json ... ``` ou du texte autour
function extractJsonCandidate(raw = "") {
  const s = String(raw || "").trim();

  // retire les fences ```json ... ``` ou ``` ... ```
  const unfenced = s
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .replace(/```/g, "")
    .trim();

  // tente de prendre le premier { ... } complet
  const first = unfenced.indexOf("{");
  const last = unfenced.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return unfenced.slice(first, last + 1);
  }
  return unfenced;
}

// fallback local si l'IA plante / renvoie n'importe quoi
function fallbackCv({ name, targetRole, experience, skillsArr, educationArr }) {
  const edu = educationArr
    .map((e) => `- ${[e.degree, e.school, e.year].filter(Boolean).join(" • ")}`)
    .join("\n");
  const skills = skillsArr.map((s) => `- ${s}`).join("\n");

  return `CV — ${name || "Candidat"}
Poste visé : ${targetRole || "—"}

EXPÉRIENCE
${experience || "—"}

FORMATION
${edu || "—"}

COMPÉTENCES
${skills || "—"}
`;
}

function fallbackLetter({ name, targetRole, experience, skillsArr }) {
  const skillsLine = skillsArr.slice(0, 10).join(", ");
  return `Objet : Candidature au poste de ${targetRole || "—"}

Bonjour,

Je vous adresse ma candidature pour le poste de ${targetRole || "—"}.
Mon expérience (${(experience || "").slice(0, 200)}${
    (experience || "").length > 200 ? "…" : ""
  }) et mes compétences (${skillsLine || "—"}) me permettront de contribuer rapidement à vos projets.

Je serais ravi d’échanger avec vous.

Cordialement,
${name || "Candidat"}
`;
}

function fallbackSuggestions({ experience, skillsArr, educationArr }) {
  const s = [];
  if (!experience || experience.length < 60)
    s.push("- Décris 2–3 missions + résultats (idéalement chiffrés).");
  if (skillsArr.length < 6)
    s.push("- Ajoute plus de compétences (frameworks, outils, méthodologies).");
  if (educationArr.length === 0) s.push("- Ajoute au moins un diplôme/formation.");
  s.push("- Ajoute 2 projets (GitHub) + mots-clés du poste.");
  return s.join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const targetRole = String(body?.targetRole || "").trim();

    const skillsArr = normalizeSkills(body?.skills);
    const educationArr = normalizeEducation(body?.education);

    // ✅ AJOUT : expérience en array
    const experienceArr = normalizeExperience(body?.experience);
    const experienceText = experienceToText(experienceArr);

    // ✅ validation adaptée : expérience = blocs
    if (!experienceText || !targetRole || skillsArr.length === 0 || educationArr.length === 0) {
      return badRequest("Champs obligatoires: education, experience, skills, targetRole");
    }

    const skillsText = skillsArr.map((s) => `- ${s}`).join("\n");
    const educationText = educationArr
      .map((e) => `- ${[e.degree, e.school, e.year].filter(Boolean).join(" • ")}`)
      .join("\n");

    const prompt = `
Tu es un expert RH.
À partir du profil suivant, génère :
1) Un CV (texte structuré, clair, ATS-friendly)
2) Une lettre de motivation (texte)
3) Des suggestions concrètes (liste à puces)

Profil :
- Nom : ${name || "(non fourni)"}
- Poste cible : ${targetRole}
- Expérience :
${experienceText}
- Formation :
${educationText}
- Compétences :
${skillsText}

CONTRAINTE IMPORTANTE :
Réponds en JSON STRICT (sans markdown, sans backticks) avec exactement ces clés :
{
  "cv": "...",
  "coverLetter": "...",
  "suggestions": "..."
}
"suggestions" doit être une string avec des puces (ex: "- ...\\n- ...").
`.trim();

    // défaut: fallback (au cas où l'IA plante)
    let cv = fallbackCv({ name, targetRole, experience: experienceText, skillsArr, educationArr });
    let coverLetter = fallbackLetter({
      name,
      targetRole,
      experience: experienceText,
      skillsArr,
    });
    let suggestions = fallbackSuggestions({
      experience: experienceText,
      skillsArr,
      educationArr,
    });

    // tentative IA
    try {
      const raw = await getGroqReply([{ role: "user", content: prompt }]);

      try {
        const jsonCandidate = extractJsonCandidate(raw);
        const parsed = JSON.parse(jsonCandidate);
        cv = String(parsed?.cv || cv);
        coverLetter = String(parsed?.coverLetter || coverLetter);
        suggestions = String(parsed?.suggestions || suggestions);
      } catch {
        if (!cv || cv.trim() === "") cv = String(raw || "");
      }
    } catch (e) {
      console.error("Groq error (fallback used):", e?.message || e);
    }

    const created = await prisma.careerGeneration.create({
      data: {
        name: name || null,
        education: JSON.stringify(educationArr),

        // ✅ AJOUT : on stocke l’expérience en JSON (comme skills/education)
        experience: JSON.stringify(experienceArr),

        skills: JSON.stringify(skillsArr),
        targetRole,
        cv,
        coverLetter,
        suggestions,
      },
      select: { id: true, cv: true, coverLetter: true, suggestions: true, createdAt: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/career error:", err);
    return NextResponse.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

/* ===========================
   ✅ AJOUT MANQUANT : LOGOUT SERVEUR (vraie déconnexion)
   -> supprime les cookies côté serveur (y compris HttpOnly)
   -> ton bouton "Déconnexion" doit appeler: fetch("/api/career", { method: "DELETE" })
=========================== */
export async function DELETE() {
  const res = NextResponse.json({ ok: true }, { status: 200 });

  // ⚠️ Mets ici les noms EXACTS de tes cookies d'auth si différents
  const cookieNames = [
    "token",
    "accessToken",
    "auth",
    "session",
    "jwt",

    // NextAuth (si jamais)
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ];

  for (const name of cookieNames) {
    // suppression cookie (important: path="/")
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }

  return res;
}