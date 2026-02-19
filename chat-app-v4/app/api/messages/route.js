import prisma from "../../../backend/lib/prisma.js";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return Response.json({ error: "conversationId manquant" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true, conversationId: true },
    });

    return Response.json(messages);
  } catch (err) {
    return Response.json(
      { error: "Erreur serveur", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}

// Optionnel: insert direct (utile pour tester sans IA)
export async function POST(req) {
  try {
    const body = await req.json();
    const conversationId = (body?.conversationId || "").trim();
    const role = (body?.role || "").trim();
    const content = (body?.content || "").trim();

    if (!conversationId || !role || !content) {
      return Response.json(
        { error: "conversationId, role, content obligatoires" },
        { status: 400 }
      );
    }

    const msg = await prisma.message.create({
      data: { conversationId, role, content },
      select: { id: true, role: true, content: true, createdAt: true, conversationId: true },
    });

    return Response.json(msg, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "Erreur serveur", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
