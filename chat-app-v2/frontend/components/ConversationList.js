"use client";

export function ConversationList({
  conversations,
  activeConversation,
  onSelect,
  onCreate,
  onDelete,
}) {
  return (
    <div style={{ width: 260, borderRight: "1px solid rgba(255,255,255,0.1)", padding: 12 }}>
      <button
        onClick={onCreate}
        style={{ width: "100%", marginBottom: 10 }}
      >
        + Nouvelle conversation
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {conversations.map((c) => (
          <div
            key={c.id}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background:
                activeConversation?.id === c.id
                  ? "rgba(124,92,255,0.3)"
                  : "rgba(255,255,255,0.05)",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onClick={() => onSelect(c)}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 160,
              }}
            >
              {c.title}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              style={{ marginLeft: 6 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
