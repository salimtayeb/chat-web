"use client";

import { useChat } from "../frontend/hooks/useChat.js";
import { MessageList } from "../frontend/components/MessageList.js";
import { ChatInput } from "../frontend/components/ChatInput.js";

export default function Page() {
  const { messages, input, setInput, sendMessage, loading, error, chatRef } = useChat();

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <h1>Chat Web</h1>
          <span className="badge">Next.js · SQLite · Prisma · Groq</span>
        </div>
        <span className="badge">Projet pédagogique</span>
      </div>

      <div className="card">
        <div className="chatArea" ref={chatRef}>
          <MessageList messages={messages} />
          {error ? <p className="error">{error}</p> : null}
        </div>

        <div className="footer">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={sendMessage}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
