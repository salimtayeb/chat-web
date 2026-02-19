"use client";
import { useRouter } from "next/navigation";

import { useMemo, useRef, useState } from "react";
import TopBar from "../../frontend/components/TopBar.js";

export default function QuizPage() {
  const router = useRouter();
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null); // { type: "ok"|"bad", message: string }

  const timerRef = useRef(null);

  const total = quiz?.questions?.length ?? 0;
  const current = useMemo(() => {
    if (!quiz?.questions?.length) return null;
    return quiz.questions[Math.min(step, quiz.questions.length - 1)];
  }, [quiz, step]);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function resetQuizState() {
    clearTimer();
    setQuiz(null);
    setStep(0);
    setAnswers({});
    setFeedback(null);
    setError("");
  }

  async function generateQuiz() {
    clearTimer();
    setLoading(true);
    setError("");
    setQuiz(null);
    setStep(0);
    setAnswers({});
    setFeedback(null);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur inconnue");

      setQuiz(data.quiz);
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function goNext() {
    setFeedback(null);
    setStep((s) => {
      if (!quiz) return s;
      return Math.min(s + 1, quiz.questions.length - 1);
    });
  }

  function prev() {
    clearTimer();
    setFeedback(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function getScoreText(extraAnswers) {
    const qz = quiz;
    const a = extraAnswers || answers;
    const gradable = (qz?.questions || []).filter((q) => typeof q.answer === "number");
    const total = gradable.length;
    let correct = 0;
    for (const q of gradable) {
      if (a[q.id] === q.answer) correct++;
    }
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return "Score : " + correct + "/" + total + " (" + pct + "%)";
  }

  function finishQuiz(extraAnswers) {
    try {
      const qz = quiz;
      const a = extraAnswers || answers;
      const gradable = (qz?.questions || []).filter((q) => typeof q.answer === "number");
      const total = gradable.length;
      let correct = 0;
      for (const q of gradable) {
        if (a[q.id] === q.answer) correct++;
      }
      const pct = total ? Math.round((correct / total) * 100) : 0;

      const payload = {
        quiz: qz,
        answers: a,
        jobText,
        score: { correct, total, pct, text: getScoreText(a) },
      };
      sessionStorage.setItem("quiz_last", JSON.stringify(payload));
    } catch (e) {}

    router.push("/quiz/result");
  }

  function handlePickChoice(choiceIdx) {
    if (!current) return;
    clearTimer();

    setAnswers((prev) => ({ ...prev, [current.id]: choiceIdx }));

    // Si on a une bonne réponse, on corrige / félicite
    if (typeof current.answer === "number") {
      const ok = choiceIdx === current.answer;
      if (ok) {
        setFeedback({ type: "ok", message: "✅ Bravo ! Bonne réponse." });
      } else {
        const goodText = current.choices?.[current.answer];
        setFeedback({
          type: "bad",
          message: `❌ Mauvaise réponse. La bonne réponse était : "${goodText}".`,
        });
      }

      // Passe à la suite automatiquement
      timerRef.current = setTimeout(() => {
        if (quiz && step < quiz.questions.length - 1) {
          goNext();
        } else {
          setFeedback((f) => f || { type: "ok", message: "Quiz terminé ✅" });
        }
      }, 900);

      return;
    }

    // Sinon (pas de answer), on enregistre et on passe à la suite
    setFeedback({ type: "ok", message: "Réponse enregistrée ✅" });

    timerRef.current = setTimeout(() => {
      if (quiz && step < quiz.questions.length - 1) {
        goNext();
      } else {
        setFeedback({ type: "ok", message: "Quiz terminé ✅ — " + getScoreText() });
      }
    }, 600);
  }

  function handleOpenNext() {
    if (!current) return;
    const v = (answers[current.id] || "").trim();
    if (!v) return;

    clearTimer();
    setFeedback({ type: "ok", message: "Réponse enregistrée ✅" });

    timerRef.current = setTimeout(() => {
      if (quiz && step < quiz.questions.length - 1) {
        goNext();
      } else {
        finishQuiz();
      }
    }, 600);
  }

  const isLast = quiz && step === quiz.questions.length - 1;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Quiz IA (offre d’emploi)</h1>
        <button onClick={() => (window.location.href = "/hub")}>← Retour</button>
      </div>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Colle une offre d’emploi. Réponds aux questions une par une. Pour les QCM, tu auras un feedback immédiat.
      </p>

      {!quiz ? (
        <section style={{ marginTop: 16 }}>
          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Colle ici l’offre d’emploi..."
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

          <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={generateQuiz}
              disabled={loading || jobText.trim().length === 0}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                cursor: loading ? "wait" : "pointer",
                opacity: loading || jobText.trim().length === 0 ? 0.6 : 1,
              }}
            >
              {loading ? "Génération..." : "Générer le quiz"}
            </button>

            {error ? <span style={{ color: "#ff6b6b" }}>{error}</span> : null}
          </div>
        </section>
      ) : (
        <section style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{quiz.title}</div>
              <div style={{ opacity: 0.8, marginTop: 4 }}>
                Domaine détecté : <b>{quiz.domain}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={resetQuizState}>Nouveau quiz</button>
            </div>
          </div>

          <div style={{ marginTop: 14, opacity: 0.8 }}>
            Question {step + 1} / {total}
          </div>

          <div style={{ marginTop: 12, padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{current?.question}</div>

            <div style={{ marginTop: 10 }}>
              {current?.type === "mcq" ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {current.choices.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePickChoice(idx)}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.15)",
                        fontWeight: 600,
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[current?.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
                  placeholder="Ta réponse..."
                  rows={5}
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
              )}
            </div>

            {feedback ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.15)",
                  opacity: 0.95,
                }}
              >
                {feedback.message}
              </div>
            ) : null}

            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
              <button onClick={prev} disabled={step === 0} style={{ opacity: step === 0 ? 0.5 : 1 }}>
                ← Précédent
              </button>

              {current?.type === "open" ? (
                <button onClick={handleOpenNext} disabled={!(answers[current?.id] || "").trim()} style={{ opacity: (answers[current?.id] || "").trim() ? 1 : 0.5 }}>
                  {isLast ? "Terminer" : "Valider & Suivant →"}
                </button>
              ) : (
                <button
                  onClick={() => {}}
                  disabled
                  style={{ opacity: 0.5 }}
                  title="Pour les QCM, tu passes automatiquement après ta réponse"
                >
                  Auto →
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
