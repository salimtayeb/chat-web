"use client";

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

export function MessageList({ messages }) {
  return (
    <div className="messages">
      {messages.map((m) => (
        <div key={m.id} className={`row ${m.role}`}>
          <div>
            <div className="bubble">{m.content}</div>
            <div className="meta">
              {m.role === "user" ? "Vous" : "Assistant"} · {formatTime(m.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
