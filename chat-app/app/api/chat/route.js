import { createMessage, getAllMessages } from "../../../backend/services/messageService.js";
import { getGroqReply } from "../../../backend/services/groqService.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = (body?.message || "").trim();

    if (!userMessage) {
      return new Response(JSON.stringify({ error: "Message vide." }), { status: 400 });
    }

    // 1) Sauvegarder le message utilisateur
    await createMessage("user", userMessage);

    // 2) Récupérer l'historique (contexte)
    const history = await getAllMessages();

    // 3) Format attendu par Groq
    const groqMessages = history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // 4) Appeler Groq
    const assistantReply = await getGroqReply(groqMessages);

    // 5) Sauvegarder la réponse IA
    await createMessage("assistant", assistantReply);

    return Response.json({ reply: assistantReply });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err.message }),
      { status: 500 }
    );
  }
}
