import { createSupabaseServerClient } from "../../../backend/lib/supabaseServer.js";

async function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return { error: "Non authentifié", status: 401 };

  const accessToken = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseServerClient(accessToken);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Utilisateur invalide", status: 401 };

  return { supabase, user };
}

export async function GET(req) {
  try {
    const { supabase, error, status } = await getUserFromRequest(req);
    if (error) return new Response(JSON.stringify({ error }), { status });

    const { data, error: dbError } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
    }

    return Response.json({ conversations: data || [] });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erreur serveur", details: err.message }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  try {
    const { supabase, user, error, status } = await getUserFromRequest(req);
    if (error) return new Response(JSON.stringify({ error }), { status });

    const body = await req.json().catch(() => ({}));
    const title = (body?.title || "Nouvelle conversation").trim() || "Nouvelle conversation";

    const { data, error: dbError } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
      .select("*")
      .single();

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
    }

    return Response.json({ conversation: data });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erreur serveur", details: err.message }), {
      status: 500,
    });
  }
}
