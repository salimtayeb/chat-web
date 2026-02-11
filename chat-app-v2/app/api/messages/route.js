import { createSupabaseServerClient } from "../../../backend/lib/supabaseServer.js";

export async function GET(req) {
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

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    const { data: messages, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return Response.json({ messages: messages || [] });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err.message }),
      { status: 500 }
    );
  }
}
