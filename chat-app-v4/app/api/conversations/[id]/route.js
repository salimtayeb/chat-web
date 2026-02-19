import { createSupabaseServerClient } from "../../../../backend/lib/supabaseServer.js";

export async function DELETE(req, { params }) {
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

    const id = params?.id;
    if (!id) {
      return new Response(JSON.stringify({ error: "ID manquant" }), { status: 400 });
    }

    const { error: dbError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err.message }),
      { status: 500 }
    );
  }
}
