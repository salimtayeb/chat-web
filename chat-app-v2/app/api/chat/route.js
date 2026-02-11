import { createSupabaseServerClient } from "../../../backend/lib/supabaseServer.js";
import { getGroqReply } from "../../../backend/services/groqService.js";

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseServerClient(accessToken);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Utilisateur invalide" }), { status: 401 });
    }

    const body = await req.json();
    const userMessage = (body?.message || "").trim();
    const conversationId = body?.conversationId;

    if (!userMessage || !conversationId) {
      return new Response(
        JSON.stringify({ error: "Message ou conversation manquant" }),
        { status: 400 }
      );
    }

    // 1) Sauvegarder le message utilisateur
    const { error: insertUserError } = await supabase.from("messages").insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: "user",
      content: userMessage,
    });

    if (insertUserError) {
      return new Response(JSON.stringify({ error: insertUserError.message }), { status: 500 });
    }

    // 2) Charger l'historique de la conversation
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (historyError) {
      return new Response(JSON.stringify({ error: historyError.message }), { status: 500 });
    }

    // 3) Appeler Groq
    const assistantReply = await getGroqReply(
      (history || []).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }))
    );

    // 4) Sauvegarder la réponse IA
    const { error: insertAiError } = await supabase.from("messages").insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: "assistant",
      content: assistantReply,
    });

    if (insertAiError) {
      return new Response(JSON.stringify({ error: insertAiError.message }), { status: 500 });
    }

    return Response.json({ reply: assistantReply });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err.message }),
      { status: 500 }
    );
  }
}
