import prisma from "../../../backend/lib/prisma.js";
import { getGroqReply } from "../../../backend/services/groqService.js";

function badRequest(msg) {
  return Response.json({ error: msg }, { status: 400 });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const name = (body?.name || "").trim();
    const education = (body?.education || "").trim();
    const experience = (body?.experience || "").trim();
    const skills = (body?.skills || "").trim();
    const targetRole = (body?.targetRole || "").trim();

    if (!education || !experience || !skills || !targetRole) {
      return badRequest("Champs obligatoires: education, experience, skills, targetRole");
    }

    // Prompt simple et stable (tu peux l'améliorer ensuite)
    const prompt = `
Tu es un expert RH.
À partir du profil suivant, génère:
1) Un CV (texte structuré)
2) Une lettre de motivation (texte)
3) Des suggestions concrètes (liste)

Profil:
- Nom: ${name || "(non fourni)"}
- Formation: ${education}
- Expérience: ${experience}
- Compétences: ${skills}
- Poste cible: ${targetRole}

Réponds en JSON STRICT avec ces clés: cv, coverLetter, suggestions.
Suggestions: string avec puces.
`;

    const raw = await getGroqReply([{ role: "user", content: prompt }]);

    // Fallback: si l'IA ne renvoie pas du JSON strict, on stocke brut dans suggestions
    let cv = "";
    let coverLetter = "";
    let suggestions = "";

    try {
      const parsed = JSON.parse(raw);
      cv = String(parsed?.cv || "");
      coverLetter = String(parsed?.coverLetter || "");
      suggestions = String(parsed?.suggestions || "");
    } catch {
      // pas du JSON: on met tout dans cv pour ne rien perdre
      cv = raw;
      coverLetter = "";
      suggestions = "";
    }

    const created = await prisma.careerGeneration.create({
      data: {
        name: name || null,
        education,
        experience,
        skills,
        targetRole,
        cv,
        coverLetter,
        suggestions,

      },
      select: { id: true, cv: true, coverLetter: true, suggestions: true, createdAt: true },
    });

    return Response.json(created, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
