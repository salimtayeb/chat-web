import prisma from "../../../../backend/lib/prisma.js";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  if (Array.isArray(parsed)) {
    return parsed
      .map((x) => {
        if (typeof x === "string") return x;
        if (x && typeof x === "object") return x.name ?? x.label ?? "";
        return "";
      })
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean).slice(0, 24);
  }

  return splitSkills(raw);
}

function normalizeEducation(raw) {
  const parsed = safeJsonParse(raw);

  if (Array.isArray(parsed)) {
    return parsed
      .map((e) => ({
        degree: String(e?.degree || "").trim(),
        school: String(e?.school || "").trim(),
        year: String(e?.year || "").trim(),
      }))
      .filter((e) => e.degree || e.school || e.year)
      .slice(0, 12);
  }

  if (Array.isArray(raw)) {
    return raw
      .map((e) => ({
        degree: String(e?.degree || "").trim(),
        school: String(e?.school || "").trim(),
        year: String(e?.year || "").trim(),
      }))
      .filter((e) => e.degree || e.school || e.year)
      .slice(0, 12);
  }

  const txt = String(raw || "").trim();
  if (!txt) return [];

  const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [{ degree: txt, school: "", year: "" }];
  return lines.slice(0, 12).map((l) => ({ degree: l, school: "", year: "" }));
}

function normalizeExperience(raw) {
  // support futur: JSON array [{title, meta, details}]
  const parsed = safeJsonParse(raw);

  if (Array.isArray(parsed)) {
    return parsed
      .map((e) => ({
        title: String(e?.title || "").trim(),
        meta: String(e?.meta || "").trim(),
        details: String(e?.details || "").trim(),
      }))
      .filter((e) => e.title || e.meta || e.details)
      .slice(0, 12);
  }

  if (Array.isArray(raw)) {
    return raw
      .map((e) => ({
        title: String(e?.title || "").trim(),
        meta: String(e?.meta || "").trim(),
        details: String(e?.details || "").trim(),
      }))
      .filter((e) => e.title || e.meta || e.details)
      .slice(0, 12);
  }

  // fallback textarea: blocs séparés par ligne vide
  const txt = String(raw || "").trim();
  if (!txt) return [];

  const blocks = txt
    .split(/\n\s*\n/g) // séparation par ligne vide
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 12);

  return blocks.map((b) => {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    const head = lines[0] || "";
    const rest = lines.slice(1).join("\n");

    // Permet "Stage | Open IT | 2025" ou "Stage - Open IT - 2025"
    let title = head;
    let meta = "";

    if (head.includes("|")) {
      const parts = head.split("|").map((x) => x.trim()).filter(Boolean);
      title = parts[0] || head;
      meta = parts.slice(1).join(" • ");
    } else if (head.includes(" - ")) {
      const parts = head.split(" - ").map((x) => x.trim()).filter(Boolean);
      title = parts[0] || head;
      meta = parts.slice(1).join(" • ");
    }

    return { title, meta, details: rest };
  });
}

function formatDateFR(d) {
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("fr-FR");
  } catch {
    return "—";
  }
}

export async function GET(req) {
  let browser = null;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400 });

    const gen = await prisma.careerGeneration.findUnique({
      where: { id: Number(id) },
    });

    if (!gen) return new Response("Not found", { status: 404 });

    const fullName = gen.name || "Candidat";
    const title = gen.targetRole || "Profil professionnel";

    const skills = normalizeSkills(gen.skills);
    const education = normalizeEducation(gen.education);
    const experiences = normalizeExperience(gen.experience);

    const educationHtml = education.length
      ? education
          .map((e) => {
            const line1 = esc(e.degree || "—");
            const line2 = [e.school, e.year].filter(Boolean).map(esc).join(" • ");
            return `
              <div class="eduItem">
                <div class="eduTitle">${line1}</div>
                ${line2 ? `<div class="eduMeta">${line2}</div>` : ""}
              </div>
            `;
          })
          .join("")
      : `<span class="muted">—</span>`;

    const expHtml = experiences.length
      ? experiences
          .map((x) => {
            const t = esc(x.title || "—");
            const m = esc(x.meta || "");
            const d = esc(x.details || "");
            return `
              <div class="expItem">
                <div class="expTitle">${t}</div>
                ${m ? `<div class="expMeta">${m}</div>` : ""}
                ${d ? `<div class="expDesc">${d}</div>` : ""}
              </div>
            `;
          })
          .join("")
      : `<span class="muted">—</span>`;

    // Profil court : poste + quelques compétences
    const profileLine = `${esc(title)}${
      skills.length ? ` • ${esc(skills.slice(0, 6).join(", "))}` : ""
    }`;

    const createdAt = formatDateFR(gen.createdAt);

    const coverLetter = String(gen.coverLetter || "").trim();
    const suggestions = String(gen.suggestions || "").trim();

    const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>CV - ${esc(fullName)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Liberation Sans";
      color: #0f172a;
      margin: 0;
      background: #ffffff;
    }
    .topbar{
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
    }
    .name { font-size: 26px; font-weight: 800; letter-spacing: -0.3px; margin: 0; }
    .title { margin: 6px 0 0 0; font-size: 12.5px; color: #475569; }
    .meta { font-size: 10.5px; color: #64748b; text-align: right; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 14px;
      align-items: start;
    }
    .section {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 12px;
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .h {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .h::before{
      content:"";
      width: 10px; height: 10px;
      border-radius: 4px;
      background: #4f46e5;
      display:inline-block;
    }
    .p { font-size: 11.5px; line-height: 1.55; margin: 0; color: #0f172a; white-space: pre-wrap; }
    .muted { color: #475569; }

    /* Badges compétences */
    .badgewrap { display:flex; flex-wrap:wrap; gap:6px; }
    .badge{
      font-size: 10.5px;
      padding: 5px 8px;
      border-radius: 999px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      color: #3730a3;
      line-height: 1;
      white-space: nowrap;
    }

    /* Formation en blocs */
    .eduList { display: grid; gap: 10px; }
    .eduItem{
      border-top: 1px dashed #e5e7eb;
      padding-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .eduItem:first-child{ border-top: 0; padding-top: 0; }
    .eduTitle{ font-size: 11.5px; font-weight: 800; }
    .eduMeta{ font-size: 10.5px; color: #64748b; margin-top: 2px; }

    /* Expérience en blocs (comme formation) */
    .expList { display: grid; gap: 10px; }
    .expItem{
      border-top: 1px dashed #e5e7eb;
      padding-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .expItem:first-child{ border-top: 0; padding-top: 0; }
    .expTitle{ font-size: 11.5px; font-weight: 800; }
    .expMeta{ font-size: 10.5px; color: #64748b; margin-top: 2px; }
    .expDesc{ font-size: 11.2px; line-height: 1.55; margin-top: 6px; white-space: pre-wrap; }

    .footer{
      margin-top: 10px;
      font-size: 9.5px;
      color: #94a3b8;
      display:flex;
      justify-content: space-between;
    }

    /* Pages séparées */
    .pageBreak{ page-break-before: always; break-before: page; }
    .docTitle{
      font-size: 18px;
      font-weight: 900;
      margin: 0 0 10px 0;
      letter-spacing: -0.2px;
    }
    .docSub{
      font-size: 11px;
      color: #64748b;
      margin: 0 0 12px 0;
    }
  </style>
</head>
<body>

  <!-- PAGE 1 : CV -->
  <div class="topbar">
    <div>
      <h1 class="name">${esc(fullName)}</h1>
      <div class="title">${esc(title)}</div>
    </div>
    <div class="meta">
      Généré le ${createdAt}
      <div class="muted">Chat Web • CV</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="section">
        <div class="h">Profil</div>
        <p class="p">${profileLine || "—"}</p>
      </div>

      <div class="section">
        <div class="h">Expérience</div>
        <div class="expList">
          ${expHtml}
        </div>
      </div>
    </div>

    <div>
      <div class="section">
        <div class="h">Formation</div>
        <div class="eduList">
          ${educationHtml}
        </div>
      </div>

      <div class="section">
        <div class="h">Compétences</div>
        <div class="badgewrap">
          ${
            skills.length
              ? skills.map((s) => `<span class="badge">${esc(s)}</span>`).join("")
              : `<span class="muted">—</span>`
          }
        </div>
      </div>

      <div class="section">
        <div class="h">Poste visé</div>
        <p class="p">${esc(gen.targetRole || "").trim() ? esc(gen.targetRole) : "—"}</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>Document généré automatiquement</div>
    <div>${esc(fullName)}</div>
  </div>

  <!-- PAGE 2 : Lettre de motivation -->
  <div class="pageBreak"></div>

  <div class="topbar">
    <div>
      <h1 class="name">${esc(fullName)}</h1>
      <div class="title">Lettre de motivation</div>
    </div>
    <div class="meta">
      Généré le ${createdAt}
      <div class="muted">Chat Web • Lettre</div>
    </div>
  </div>

  <h2 class="docTitle">Lettre de motivation</h2>
  <p class="docSub">Poste visé : ${esc(title)}</p>

  <div class="section">
    <p class="p">${coverLetter ? esc(coverLetter) : "—"}</p>
  </div>

  <div class="footer">
    <div>Document généré automatiquement</div>
    <div>${esc(fullName)}</div>
  </div>

  <!-- PAGE 3 : Suggestions -->
  <div class="pageBreak"></div>

  <div class="topbar">
    <div>
      <h1 class="name">${esc(fullName)}</h1>
      <div class="title">Suggestions</div>
    </div>
    <div class="meta">
      Généré le ${createdAt}
      <div class="muted">Chat Web • Suggestions</div>
    </div>
  </div>

  <h2 class="docTitle">Suggestions</h2>
  <p class="docSub">Améliorations recommandées</p>

  <div class="section">
    <p class="p">${suggestions ? esc(suggestions) : "—"}</p>
  </div>

  <div class="footer">
    <div>Document généré automatiquement</div>
    <div>${esc(fullName)}</div>
  </div>

</body>
</html>`;

    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "screen" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    const filename = `cv_${fullName.replaceAll(" ", "_")}.pdf`;

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF route error:", err);
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
