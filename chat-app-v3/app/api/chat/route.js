import prisma from "../../../backend/lib/prisma.js";
import { getGroqReply } from "../../../backend/services/groqService.js";

export async function POST(req) {
  try {
    const body = await req.json();

    const userMessage = (body?.message || "").trim();
    const conversationId = (body?.conversationId || "").trim();

    if (!conversationId || !userMessage) {
      return Response.json(
        { error: "Message ou conversationId manquant" },
        { status: 400 }
      );
    }

    // (Optionnel mais propre) vérifier que la conversation existe
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conv) {
      return Response.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    // 1) Sauvegarder le message user
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: userMessage,
      },
    });

    // 2) Charger l'historique depuis Prisma
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    // 3) Appeler Groq avec l'historique
    const assistantReply = await getGroqReply(
      (history || []).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }))
    );

    // 4) Sauvegarder la réponse assistant
    await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: assistantReply,
      },
    });

    return Response.json({ reply: assistantReply });
  } catch (err) {
    return Response.json(
      { error: "Erreur serveur", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
