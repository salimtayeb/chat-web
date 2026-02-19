import { NextResponse } from "next/server";
import prisma from "../../../backend/lib/prisma.js";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function safeJsonParse(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const sub = cleaned.slice(start, end + 1);
    return JSON.parse(sub);
  }
  throw new Error("Invalid JSON from model");
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const jobText = (body.jobText || "").trim();
  if (!jobText) {
    return NextResponse.json({ error: "jobText is required" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY manquante dans .env.local" },
      { status: 500 }
    );
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const system = `
Tu es un expert RH + formateur du métier concerné.
Ta mission: générer un quiz TECHNIQUE + SITUATIONNEL vraiment adapté au texte exact de l'offre d'emploi.
IMPORTANT:
- Réponds UNIQUEMENT en JSON (pas de markdown, pas de texte autour).
- Les questions doivent reprendre les compétences/outils/missions mentionnés dans l'offre.
- Pas de questions génériques. Si l'offre parle d'Excel, WMS, check-in, HACCP, CACES, React, etc. => questions dessus.
- Langue: français.

Schéma JSON attendu EXACT:
{
  "title": string,
  "domain": string,
  "questions": [
    {
      "id": string,
      "type": "mcq" | "open",
      "question": string,
      "choices": string[] (uniquement si type="mcq"),
      "answer": number (index de la bonne réponse, uniquement si type="mcq"),
      "explanation": string (courte explication, uniquement si type="mcq")
    }
  ]
}

Contraintes:
- 10 questions au total
- 7 QCM + 3 ouvertes
- Les QCM doivent avoir 4 choix, 1 seule bonne réponse.
- Les questions ouvertes doivent être très liées au poste (cas pratique / situation terrain).
`;

  const user = `
Voici l'offre d'emploi (à analyser et à utiliser comme source unique):
"""
${jobText}
"""
Génère le quiz au format JSON demandé.
`;

  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system.trim() },
          { role: "user", content: user.trim() },
        ],
      }),
    });

    const raw = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ error: "Groq error", details: raw }, { status: 500 });
    }

    const content = raw?.choices?.[0]?.message?.content || "";
    const quiz = safeJsonParse(content);

    if (!quiz?.questions?.length) throw new Error("Quiz vide");

    // 1) Sauvegarde DB (payload = JSON stringifié)
    const created = await prisma.quiz.create({
      data: {
        title: String(quiz.title || "Quiz"),
        domain: String(quiz.domain || ""),
        jobText,
        payload: JSON.stringify(quiz),
      },
    });

    // 2) Sauvegarde fichier JSON (dans data/quizzes/<id>.json)
    const dir = path.join(process.cwd(), "data", "quizzes");
    await fs.mkdir(dir, { recursive: true });
    const fileAbs = path.join(dir, `${created.id}.json`);
    await fs.writeFile(fileAbs, JSON.stringify(quiz, null, 2), "utf8");

    return NextResponse.json({
      quiz,
      saved: {
        id: created.id,
        file: `data/quizzes/${created.id}.json`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur serveur", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
