import { getAllMessages } from "../../../backend/services/messageService.js";

export async function GET() {
  try {
    const messages = await getAllMessages();
    return Response.json({ messages });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err.message }),
      { status: 500 }
    );
  }
}
