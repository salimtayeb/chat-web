import prisma from "../../../backend/lib/prisma.js";

// GET /api/conversations
export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true },
    });
    return Response.json(conversations);
  } catch (err) {
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// POST /api/conversations
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = (body?.title || "Nouvelle conversation").trim() || "Nouvelle conversation";

    const conversation = await prisma.conversation.create({
      data: { title },
      select: { id: true, title: true, createdAt: true },
    });

    return Response.json(conversation, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations?id=...
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();

    if (!id) {
      return Response.json({ error: "id manquant" }, { status: 400 });
    }

    // Supprime d'abord les messages (si relation pas en cascade au niveau DB)
    await prisma.message.deleteMany({ where: { conversationId: id } });

    // Puis supprime la conversation
    await prisma.conversation.delete({ where: { id } });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
