import prisma from "../../../backend/lib/prisma.js";
import { getGroqReply } from "../../../backend/services/groqService.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(msg) {
  return Response.json({ error: msg }, { status: 400 });
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

function splitSkills(skills = "") {
  return String(skills)
    .split(/[,;\n]/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 24);
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
    return raw
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  // 3) legacy string
  return splitSkills(raw);
}

function normalizeEducation(raw) {
  const parsed = safeJsonParse(raw);
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(raw) ? raw : null;

  // 1) array (JSON ou direct) attendu: [{ degree, school, year }]
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

  // 2) legacy string -> lignes / blocs
  const txt = String(raw || "").trim();
  if (!txt) return [];

  const lines = txt
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [{ degree: txt, school: "", year: "" }];
  }

  // chaque ligne = un diplôme (fallback)
  return lines.slice(0, 12).map((l) => ({ degree: l, school: "", year: "" }));
}

function normalizeExperience(raw) {
  const parsed = safeJsonParse(raw);
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(raw) ? raw : null;

  // 1) array (JSON ou direct) attendu: [{ title, company, year, details }]
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

  // 2) legacy string -> blocs séparés par lignes vides
  const txt = String(raw || "").trim();
  if (!txt) return [];

  const blocks = txt
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 12);

  return blocks.map((b) => {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines[0] || "";
    const details = lines.slice(1).join("\n");

    let title = head;
    let company = "";
    let year = "";

    // formats acceptés:
    // "Stage | Open IT | 2025"
    // "Stage - Open IT - 2025"
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

function educationToText(education = []) {
  if (!Array.isArray(education) || education.length === 0) return "";
  return education
    .slice(0, 12)
    .map((e) => `- ${[e.degree, e.school, e.year].filter(Boolean).join(" • ")}`)
    .join("\n");
}

// parfois l'IA renvoie ```json ... ``` ou du texte autour
function extractJsonCandidate(raw = "") {
  const s = String(raw || "").trim();

  const unfenced = s
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .replace(/```/g, "")
    .trim();

  const first = unfenced.indexOf("{");
  const last = unfenced.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return unfenced.slice(first, last + 1);
  }
  return unfenced;
}

/* ===========================
   ✅ AJOUTS : infos personnelles (naissance/ville/coordonnées)
   - on n'impose pas ces champs comme "obligatoires"
   - on les inclut dans le prompt
   - on les stocke si présents (et si tes colonnes Prisma existent)
=========================== */
function normalizeBirthDate(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  // on garde simple: accepte "YYYY-MM-DD" ou "DD/MM/YYYY" ou texte
  return s.slice(0, 40);
}

function normalizeEmail(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.slice(0, 120);
}

function normalizePhone(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.slice(0, 60);
}

function normalizeCity(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.slice(0, 80);
}
/* ===========================
   ✅ FIN AJOUTS
=========================== */

export async function POST(req) {
  try {
    const body = await req.json();

    const name = String(body?.name || "").trim();

    // ✅ nouveaux champs infos perso (optionnels)
    const birthDate = normalizeBirthDate(body?.birthDate);
    const city = normalizeCity(body?.city);
    const email = normalizeEmail(body?.email);
    const phone = normalizePhone(body?.phone);

    // ✅ maintenant on accepte string OU blocs (array) pour ces champs
    const educationArr = normalizeEducation(body?.education);
    const experienceArr = normalizeExperience(body?.experience);
    const skillsArr = normalizeSkills(body?.skills);

    const targetRole = String(body?.targetRole || "").trim();

    // validation obligatoire
    const educationText = educationToText(educationArr);
    const experienceText = experienceToText(experienceArr);
    const skillsText = skillsArr.map((s) => `- ${s}`).join("\n");

    if (!educationText || !experienceText || skillsArr.length === 0 || !targetRole) {
      return badRequest(
        "Champs obligatoires: education, experience, skills, targetRole"
      );
    }

    // ✅ Ajout infos perso au prompt (sans casser le reste)
    const personalBlock = `
Infos personnelles (si disponibles) :
- Date de naissance : ${birthDate || "—"}
- Ville : ${city || "—"}
- Email : ${email || "—"}
- Téléphone : ${phone || "—"}
`.trim();

    // Prompt stable + JSON strict
    const prompt = `
Tu es un expert RH.
À partir du profil suivant, génère:
1) Un CV (texte structuré, clair)
2) Une lettre de motivation (texte)
3) Des suggestions concrètes (liste)

Profil:
- Nom: ${name || "(non fourni)"}
- Poste cible: ${targetRole}

${personalBlock}

- Formation:
${educationText}
- Expérience:
${experienceText}
- Compétences:
${skillsText}

CONTRAINTE:
Réponds en JSON STRICT (sans markdown, sans backticks) avec ces clés: cv, coverLetter, suggestions.
"suggestions" doit être une string avec des puces (ex: "- ...\\n- ...").
`.trim();

    const raw = await getGroqReply([{ role: "user", content: prompt }]);

    let cv = "";
    let coverLetter = "";
    let suggestions = "";

    try {
      const jsonCandidate = extractJsonCandidate(raw);
      const parsed = JSON.parse(jsonCandidate);
      cv = String(parsed?.cv || "");
      coverLetter = String(parsed?.coverLetter || "");
      suggestions = String(parsed?.suggestions || "");
    } catch {
      // pas du JSON: on met tout dans cv pour ne rien perdre
      cv = String(raw || "");
      coverLetter = "";
      suggestions = "";
    }

    // ✅ IMPORTANT: on stocke en JSON string pour garder les blocs (compatible PDF)
    // ✅ AJOUT: on stocke aussi infos perso si présentes (sans casser si colonnes non ajoutées)
    const baseData = {
      name: name || null,
      education: JSON.stringify(educationArr),
      experience: JSON.stringify(experienceArr),
      skills: JSON.stringify(skillsArr),
      targetRole,
      cv,
      coverLetter,
      suggestions,
    };

    const data = {
      ...baseData,
      ...(birthDate ? { birthDate } : {}),
      ...(city ? { city } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    };

    const created = await prisma.careerGeneration.create({
      data,
      select: {
        id: true,
        cv: true,
        coverLetter: true,
        suggestions: true,
        createdAt: true,

        // ✅ AJOUT: renvoyer aussi les infos perso (pour vérifier côté front)
        birthDate: true,
        city: true,
        email: true,
        phone: true,
      },
    });

    return Response.json(created, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}