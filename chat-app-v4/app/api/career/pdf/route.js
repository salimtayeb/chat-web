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

function splitSkills(skills = "") {
  // split virgule / point-virgule / nouvelle ligne
  return String(skills)
    .split(/[,;\n]/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 24);
}

/* ===========================
   ✅ AJOUTS : support JSON + perf + infos perso
=========================== */
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

  if (Array.isArray(parsed)) {
    return parsed
      .map((x) => (typeof x === "string" ? x : x?.name ?? x?.label ?? x?.language ?? ""))
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
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(raw) ? raw : null;

  if (arr) {
    return arr
      .map((e) => ({
        degree: String(e?.degree ?? e?.titre ?? e?.title ?? "").trim(),
        school: String(e?.school ?? e?.etablissement ?? e?.company ?? "").trim(),
        year: String(e?.year ?? e?.dates ?? e?.date ?? "").trim(),
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
  const parsed = safeJsonParse(raw);
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(raw) ? raw : null;

  if (arr) {
    return arr
      .map((e) => ({
        title: String(e?.title ?? e?.titre ?? "").trim(),
        company: String(e?.company ?? e?.entreprise ?? e?.project ?? "").trim(),
        year: String(e?.year ?? e?.dates ?? e?.date ?? "").trim(),
        details: Array.isArray(e?.description)
          ? e.description.map((x) => String(x).trim()).filter(Boolean).join("\n")
          : String(e?.details ?? e?.description ?? "").trim(),
      }))
      .filter((e) => e.title || e.company || e.year || e.details)
      .slice(0, 12);
  }

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

function formatDateFR(d) {
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("fr-FR");
  } catch {
    return "—";
  }
}

// fallback infos perso depuis gen.cv si tu n’as pas encore ajouté les colonnes
function extractPersonalFromCv(rawCv) {
  const parsed = safeJsonParse(rawCv);
  const obj = parsed && typeof parsed === "object" ? parsed : null;

  // cas: { cv: { ... } }
  const cvObj = obj?.cv && typeof obj.cv === "object" ? obj.cv : obj;

  if (!cvObj || typeof cvObj !== "object") return {};

  const email = cvObj.adrMail ?? cvObj.email ?? "";
  const phone = cvObj.telephone ?? cvObj.phone ?? "";
  const city = cvObj.lieuDeResidence ?? cvObj.ville ?? cvObj.city ?? "";
  const birthDate = cvObj.dateNaissance ?? cvObj.birthDate ?? "";

  return {
    email: String(email || "").trim(),
    phone: String(phone || "").trim(),
    city: String(city || "").trim(),
    birthDate: String(birthDate || "").trim(),
  };
}

/* ✅ PERF: cache chromium (accélère beaucoup en dev) */
let _browserPromise = null;
async function getBrowser() {
  if (!_browserPromise) {
    _browserPromise = chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return _browserPromise;
}
/* ===========================
   ✅ FIN AJOUTS
=========================== */

export async function GET(req) {
  let page = null;

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

    const createdAt = formatDateFR(gen.createdAt);

    // ✅ sections CV (uniquement celles voulues)
    const skills = normalizeSkills(gen.skills);
    const educationArr = normalizeEducation(gen.education);
    const experienceArr = normalizeExperience(gen.experience);

    // ✅ infos perso : d’abord colonnes DB si elles existent, sinon fallback depuis cv
    const fallbackPersonal = extractPersonalFromCv(gen.cv);
    const birthDate = String(gen.birthDate ?? fallbackPersonal.birthDate ?? "").trim();
    const city = String(gen.city ?? fallbackPersonal.city ?? "").trim();
    const email = String(gen.email ?? fallbackPersonal.email ?? "").trim();
    const phone = String(gen.phone ?? fallbackPersonal.phone ?? "").trim();

    const personalRows = [
      birthDate ? `<div class="infoRow"><span class="k">Date de naissance</span><span class="v">${esc(birthDate)}</span></div>` : "",
      city ? `<div class="infoRow"><span class="k">Ville</span><span class="v">${esc(city)}</span></div>` : "",
      email ? `<div class="infoRow"><span class="k">Email</span><span class="v">${esc(email)}</span></div>` : "",
      phone ? `<div class="infoRow"><span class="k">Téléphone</span><span class="v">${esc(phone)}</span></div>` : "",
    ].filter(Boolean);

    const educationHtml =
      educationArr.length > 0
        ? educationArr
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

    const experienceHtml =
      experienceArr.length > 0
        ? experienceArr
            .map((x) => {
              const head = [x.title, x.company, x.year].filter(Boolean).map(esc).join(" • ");
              const details = String(x.details || "").trim();
              return `
                <div class="xpItem">
                  <div class="xpTitle">${head || "—"}</div>
                  ${details ? `<div class="xpDetails">${esc(details)}</div>` : ""}
                </div>
              `;
            })
            .join("")
        : `<span class="muted">—</span>`;

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

    /* Blocs Formation / Expérience */
    .eduList, .xpList { display: grid; gap: 10px; }
    .eduItem, .xpItem{
      border-top: 1px dashed #e5e7eb;
      padding-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .eduItem:first-child, .xpItem:first-child{
      border-top: 0;
      padding-top: 0;
    }
    .eduTitle, .xpTitle{ font-size: 11.5px; font-weight: 800; }
    .eduMeta{ font-size: 10.5px; color: #64748b; margin-top: 2px; }
    .xpDetails{ font-size: 11.2px; color: #0f172a; margin-top: 6px; white-space: pre-wrap; }

    /* Infos perso */
    .infoBox{ display:grid; gap:8px; }
    .infoRow{ display:flex; justify-content:space-between; gap:10px; font-size:11px; }
    .infoRow .k{ color:#64748b; }
    .infoRow .v{ color:#0f172a; font-weight:700; text-align:right; word-break: break-word; }

    /* Page break (Lettre + Suggestions page 2) */
    .pageBreak { break-before: page; page-break-before: always; }

    .p { font-size: 11.5px; line-height: 1.55; margin: 0; color: #0f172a; white-space: pre-wrap; }

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
  <!-- PAGE 1 : CV (uniquement infos perso + formation + expérience + compétences) -->
  <div class="topbar">
    <div>
      <h1 class="name">${esc(fullName)}</h1>
      <div class="title">${esc(title)}</div>
    </div>
    <div class="meta">
      Généré le ${esc(createdAt)}
      <div class="muted">Chat Web • CV</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="section">
        <div class="h">Expérience</div>
        <div class="xpList">${experienceHtml}</div>
      </div>
    </div>

    <div>
      <div class="section">
        <div class="h">Infos personnelles</div>
        <div class="infoBox">
          ${
            personalRows.length
              ? personalRows.join("")
              : `<span class="muted">—</span>`
          }
        </div>
      </div>

      <div class="section">
        <div class="h">Formation</div>
        <div class="eduList">${educationHtml}</div>
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
    </div>
  </div>

  <div class="footer">
    <div>Document généré automatiquement</div>
    <div>${esc(fullName)}</div>
  </div>

  <!-- PAGE 2 : Lettre + Suggestions -->
  <div class="pageBreak"></div>

  <div class="topbar">
    <div>
      <h1 class="name" style="font-size:20px;">Lettre & Suggestions</h1>
      <div class="title">${esc(fullName)} • ${esc(title)}</div>
    </div>
    <div class="meta">
      ${esc(createdAt)}
      <div class="muted">Chat Web</div>
    </div>
  </div>

  <div class="section letter">
    <div class="h">Lettre de motivation</div>
    <p class="p">${esc(gen.coverLetter || "").trim() ? esc(gen.coverLetter) : "—"}</p>
  </div>

  <div class="section">
    <div class="h">Suggestions</div>
    <p class="p">${esc(gen.suggestions || "").trim() ? esc(gen.suggestions) : "—"}</p>
  </div>

  <div class="footer">
    <div>Document généré automatiquement</div>
    <div>${esc(fullName)}</div>
  </div>
</body>
</html>`;

    const browser = await getBrowser();
    page = await browser.newPage();

    // ✅ plus rapide que "load"
    await page.setContent(html, { waitUntil: "domcontentloaded" });

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
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {}
    }
  }
}