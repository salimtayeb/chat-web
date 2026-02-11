import { NextResponse } from "next/server";
import { getGroqReply } from "../../../backend/services/groqService.js";

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function extractJson(text) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const name = (body?.name || "").trim();
    const education = (body?.education || "").trim();
    const experience = (body?.experience || "").trim();
    const skills = (body?.skills || "").trim();
    const targetRole = (body?.targetRole || "").trim();

    if (!education) return badRequest("formation manquante");
    if (!experience) return badRequest("expérience manquante");
    if (!skills) return badRequest("compétences manquantes");
    if (!targetRole) return badRequest("poste visé manquant");

    const prompt = `
Réponds STRICTEMENT en JSON valide.
Clés attendues :
- cv (string)
- coverLetter (string)
- suggestions (array de strings)

Profil :
Nom : ${name || "non fourni"}
Formation : ${education}
Expériences : ${experience}
Compétences : ${skills}
Poste visé : ${targetRole}
`.trim();

    const aiText = await getGroqReply([
      { role: "system", content: "Tu es un assistant carrière." },
      { role: "user", content: prompt },
    ]);

    const parsed = extractJson(aiText);

    if (!parsed) {
      return NextResponse.json(
        { error: "JSON invalide", raw: aiText },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: "Career API error", details: err.message },
      { status: 500 }
    );
  }
}
