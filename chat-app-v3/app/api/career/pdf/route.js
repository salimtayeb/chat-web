import prisma from "../../../../backend/lib/prisma.js";
import { chromium } from "playwright";

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitSkills(skills = "") {
  // split virgule / point-virgule / nouvelle ligne
  return String(skills)
    .split(/[,;\n]/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export async function GET(req) {
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

    const skills = splitSkills(gen.skills);

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
    .badgewrap { display:flex; flex-wrap:wrap; gap:6px; }
    .badge{
      font-size: 10.5px;
      padding: 5px 8px;
      border-radius: 999px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      color: #3730a3;
      line-height: 1;
    }
    .divider { height: 1px; background: #e5e7eb; margin: 10px 0; }

    /* Lettre / Suggestions */
    .letter .p { font-size: 11.2px; }
    .footer{
      margin-top: 10px;
      font-size: 9.5px;
      color: #94a3b8;
      display:flex;
      justify-content: space-between;
    }

    /* Evite les coupures moches */
    .section { break-inside: avoid; }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <h1 class="name">${esc(fullName)}</h1>
      <div class="title">${esc(title)}</div>
    </div>
    <div class="meta">
      Généré le ${new Date(gen.createdAt).toLocaleString("fr-FR")}
      <div class="muted">Chat Web • CV + Lettre</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="section">
        <div class="h">Profil</div>
        <p class="p">${esc(gen.experience || "").trim() ? esc(gen.experience) : "—"}</p>
      </div>

      <div class="section">
        <div class="h">Expérience</div>
        <p class="p">${esc(gen.experience || "").trim() ? esc(gen.experience) : "—"}</p>
      </div>

      <div class="section letter">
        <div class="h">Lettre de motivation</div>
        <p class="p">${esc(gen.coverLetter || "").trim() ? esc(gen.coverLetter) : "—"}</p>
      </div>

      <div class="section">
        <div class="h">Suggestions</div>
        <p class="p">${esc(gen.suggestions || "").trim() ? esc(gen.suggestions) : "—"}</p>
      </div>
    </div>

    <div>
      <div class="section">
        <div class="h">Formation</div>
        <p class="p">${esc(gen.education || "").trim() ? esc(gen.education) : "—"}</p>
      </div>

      <div class="section">
        <div class="h">Compétences</div>
        <div class="badgewrap">
          ${skills.length ? skills.map((s) => `<span class="badge">${esc(s)}</span>`).join("") : `<span class="muted">—</span>`}
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
</body>
</html>`;

    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    await browser.close();

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
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
