"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function QuizResultPage() {
  const router = useRouter();

  const [payload, setPayload] = useState(null);

  // CV input
  const [cvMode, setCvMode] = useState("text"); // "text" | "pdf"
  const [cvText, setCvText] = useState("");
  const [cvPdf, setCvPdf] = useState(null); // File

  // Matching
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchMsg, setMatchMsg] = useState("");
  const [matchPct, setMatchPct] = useState(null); // number
  const [matchReport, setMatchReport] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("quiz_last");
      if (!raw) return;
      setPayload(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const scoreText = useMemo(() => {
    if (!payload) return "";
    if (payload?.score?.text) return payload.score.text;

    const quiz = payload?.quiz;
    const answers = payload?.answers || {};
    if (!quiz?.questions?.length) return "";

    const gradable = quiz.questions.filter((q) => typeof q.answer === "number");
    const total = gradable.length;
    let correct = 0;
    for (const q of gradable) if (answers[q.id] === q.answer) correct++;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return `Score : ${correct}/${total} (${pct}%)`;
  }, [payload]);

  async function handleMatch() {
    if (!payload) return;

    setMatchMsg("");
    setMatchPct(null);
    setMatchReport("");

    // validations simples
    if (cvMode === "text" && !(cvText || "").trim()) {
      setMatchMsg("Colle ton CV en texte avant d’analyser.");
      return;
    }
    if (cvMode === "pdf" && !cvPdf) {
      setMatchMsg("Choisis un fichier PDF avant d’analyser.");
      return;
    }

    setMatchLoading(true);
    try {
      const quizScorePct = Number(payload?.score?.pct ?? 0) || 0;

      let res;
      if (cvMode === "pdf") {
        // On envoie le fichier (sans extraction pour l’instant, comme tu veux)
        const fd = new FormData();
        fd.set("cvMode", "pdf");
        fd.set("cvText", ""); // pas de texte
        fd.set("cvPdf", cvPdf);
        fd.set("quizTitle", payload?.quiz?.title || "");
        fd.set("jobText", payload?.jobText || "");
        fd.set("quizScorePct", String(quizScorePct));

        res = await fetch("/api/match", { method: "POST", body: fd });
      } else {
        // Mode texte
        res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cvMode: "text",
            cvText,
            quizTitle: payload?.quiz?.title || "",
            jobText: payload?.jobText || "",
            quizScorePct,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setMatchMsg(data?.error || "Erreur matching");
        return;
      }

      setMatchPct(data.matchPct);
      setMatchReport(data.report || "");
      setMatchMsg(
        `✅ Matching calculé : ${data.matchPct}% (enregistré en BDD id=${data?.saved?.id || "?"}).`
      );
    } catch (e) {
      setMatchMsg("Impossible de contacter le serveur.");
    } finally {
      setMatchLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Résultat du quiz</h1>
        <button onClick={() => router.push("/quiz")}>← Retour au quiz</button>
      </div>

      {!payload ? (
        <p style={{ marginTop: 12, opacity: 0.85 }}>
          Aucun résultat trouvé. Termine un quiz d’abord.
        </p>
      ) : (
        <>
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {payload.quiz?.title || "Quiz"}
            </div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>{scoreText}</div>
            {payload.quiz?.domain ? (
              <div style={{ marginTop: 6, opacity: 0.75 }}>
                Domaine : <b>{payload.quiz.domain}</b>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                {cvMode === "pdf" ? "Ajoute ton CV (PDF) ici" : "Colle ton CV (texte) ici"}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setCvMode("text")}
                  style={{ opacity: cvMode === "text" ? 1 : 0.6 }}
                  type="button"
                >
                  Texte
                </button>
                <button
                  onClick={() => setCvMode("pdf")}
                  style={{ opacity: cvMode === "pdf" ? 1 : 0.6 }}
                  type="button"
                >
                  PDF
                </button>
              </div>
            </div>

            {cvMode === "text" ? (
              <textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Colle le texte de ton CV ici..."
                rows={10}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.2)",
                  color: "white",
                  outline: "none",
                }}
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCvPdf(e.target.files?.[0] || null)}
                />
                <div style={{ opacity: 0.8, fontSize: 13 }}>
                  {cvPdf ? "Fichier sélectionné : " + cvPdf.name : "Choisis un fichier PDF."}
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={handleMatch}
                disabled={matchLoading}
                style={{ opacity: matchLoading ? 0.7 : 1, width: "100%" }}
              >
                {matchLoading ? "Analyse en cours..." : "Analyser le matching"}
              </button>
            </div>

            {matchMsg ? (
              <div style={{ marginTop: 10, opacity: 0.9 }}>{matchMsg}</div>
            ) : null}

            {matchPct !== null ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  Matching : {matchPct}%
                </div>
                {matchReport ? (
                  <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", opacity: 0.9 }}>
                    {matchReport}
                  </pre>
                ) : null}
              </div>
            ) : null}

            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
              Note : si tu envoies un PDF, on ne lit pas encore son contenu (pas d’extraction). Le matching est donc approximatif.
            </div>
          </div>
        </>
      )}
    </main>
  );
}
