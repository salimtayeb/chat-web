import Groq from "groq-sdk";

export async function getGroqReply(messages) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY manquante dans .env");
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  return content || "Je n'ai pas réussi à générer une réponse.";
}
