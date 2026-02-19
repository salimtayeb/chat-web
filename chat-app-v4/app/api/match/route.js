import { NextResponse } from "next/server";
import prisma from "@/backend/lib/prisma";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function safeJsonParse(text) {
  const cleaned = String(text || "")
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
    return JSON.parse(cleaned.slice(start, end + 1));
  }
  throw new Error("Invalid JSON from model");
}

export async function POST(req) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY manquante" }, { status: 500 });
  }

  // On accepte JSON ou FormData
  let body = null;
  let cvMode = "text";
  let cvText = "";
  let cvFileName = null;

  let quizTitle = null;
  let jobText = "";
  let quizScorePct = 0;

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();

    cvMode = String(fd.get("cvMode") || "text");
    cvText = String(fd.get("cvText") || "");
    const file = fd.get("cvPdf");
    if (file && typeof file === "object") {
      cvFileName = file.name || "cv.pdf";
      // IMPORTANT: tu as dit ne pas faire l’extraction maintenant.
      // Donc on ne lit pas le PDF ici. (On fera l’étape “extraction” plus tard si tu veux.)
    }

    quizTitle = fd.get("quizTitle") ? String(fd.get("quizTitle")) : null;
    jobText = String(fd.get("jobText") || "");
    quizScorePct = Number(fd.get("quizScorePct") || 0) || 0;
  } else {
    body = await req.json().catch(() => ({}));
    cvMode = String(body.cvMode || "text");
    cvText = String(body.cvText || "");
    cvFileName = body.cvFileName ? String(body.cvFileName) : null;

    quizTitle = body.quizTitle ? String(body.quizTitle) : null;
    jobText = String(body.jobText || "");
    quizScorePct = Number(body.quizScorePct || 0) || 0;
  }

  jobText = (jobText || "").trim();
  if (!jobText) {
    return NextResponse.json({ error: "jobText manquant" }, { status: 400 });
  }

  // Si PDF sans extraction -> on ne peut pas analyser le contenu => matching dégradé
  // (on calcule quand même un score en se basant sur l’offre + score quiz)
  const cvAvailable = (cvMode === "text" && cvText.trim().length > 0);

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const system = `
Tu es un recruteur technique.
Tu dois calculer un pourcentage de matching (0-100) entre un candidat et une offre, en utilisant:
- le texte de l’offre
- le score du quiz (pourcentage)
- le CV (si fourni en texte; si pas de CV texte, tu le dis clairement)

IMPORTANT:
- Réponds UNIQUEMENT en JSON.
- Format JSON EXACT:
{
  "matchPct": number,
  "report": string
}

Règles:
- matchPct doit être un entier 0..100.
- Le report doit être court et utile (5-10 lignes max).
- Si le CV n’est pas disponible en texte, fais un matching “approximatif” basé sur offre + score quiz et indique clairement que le PDF n’a pas été analysé.
`.trim();

  const user = `
OFFRE D'EMPLOI:
"""
${jobText}
"""

SCORE QUIZ: ${quizScorePct}%

CV_MODE: ${cvMode}
CV_TEXTE (si disponible):
"""
${cvAvailable ? cvText : "[NON DISPONIBLE EN TEXTE]"}
"""

Donne le JSON demandé.
`.trim();

  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const raw = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ error: "Groq error", details: raw }, { status: 500 });
    }

    const content = raw?.choices?.[0]?.message?.content || "";
    const out = safeJsonParse(content);

    const matchPct = Math.max(0, Math.min(100, parseInt(out.matchPct, 10) || 0));
    const report = String(out.report || "");

    const saved = await prisma.matchResult.create({
      data: {
        quizTitle,
        jobText,
        quizScorePct: Math.max(0, Math.min(100, parseInt(quizScorePct, 10) || 0)),
        cvMode,
        cvText: cvMode === "text" ? cvText : null,
        cvFileName,
        matchPct,
        report,
      },
      select: { id: true, matchPct: true },
    });

    return NextResponse.json({ matchPct, report, saved });
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur serveur", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
