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
      {messages.map((m) => {
        const created = m.createdAt || m.created_at || "";
        const role = m.role || "user";

        return (
          <div key={m.id} className={`row ${role}`}>
            <div>
              <div className="bubble">{m.content}</div>
              <div className="meta">
                {role === "user" ? "Vous" : "Assistant"} · {formatTime(created)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
