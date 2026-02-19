"use client";

export function ChatInput({ input, setInput, onSend, loading }) {
  return (
    <>
      <input
        className="input"
        placeholder="Écris un message…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        disabled={loading}
      />
      <button className="button" onClick={onSend} disabled={loading}>
        {loading ? "..." : "Envoyer"}
      </button>
    </>
  );
}
