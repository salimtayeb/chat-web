"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../frontend/hooks/useAuth.js";
import { useChat } from "../frontend/hooks/useChat.js";
import { useConversations } from "../frontend/hooks/useConversations.js";

import { MessageList } from "../frontend/components/MessageList.js";
import { ChatInput } from "../frontend/components/ChatInput.js";
import { ConversationList } from "../frontend/components/ConversationList.js";

export default function Page() {
  const router = useRouter();
  const { user, loadingAuth, signOut } = useAuth();

  const {
    conversations,
    activeConversation,
    setActiveConversation,
    createConversation,
    deleteConversation,
  } = useConversations();

  const {
    messages,
    input,
    setInput,
    sendMessage,
    loading,
    error,
    chatRef,
    loadMessagesForConversation,
    setConversationId,
  } = useChat();

  // Redirection si non connecté
  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push("/login");
    }
  }, [loadingAuth, user, router]);

  // Quand on change de conversation active → charger l'historique
  useEffect(() => {
    if (activeConversation?.id) {
      setConversationId(activeConversation.id);
      loadMessagesForConversation(activeConversation.id);
    }
  }, [activeConversation, loadMessagesForConversation, setConversationId]);

  if (loadingAuth || !user) {
    return <p style={{ padding: 20 }}>Chargement…</p>;
  }

  return (
    <div className="container" style={{ padding: 0 }}>
      <div className="header" style={{ padding: "20px 18px" }}>
        <div className="brand">
          <h1>Chat Web</h1>
          <span className="badge">Connecté : {user.email}</span>
          <span className="badge">
            Conversation : {activeConversation ? activeConversation.title : "Aucune"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={signOut}>Déconnexion</button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", height: "70vh" }}>
        {/* Colonne gauche : Conversations */}
        <ConversationList
          conversations={conversations}
          activeConversation={activeConversation}
          onSelect={setActiveConversation}
          onCreate={createConversation}
          onDelete={deleteConversation}
        />

        {/* Colonne droite : Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="chatArea" ref={chatRef} style={{ flex: 1 }}>
            <MessageList messages={messages} />
            {error ? <p className="error">{error}</p> : null}
          </div>

          <div className="footer">
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={sendMessage}
              loading={loading || !activeConversation}
            />
          </div>

          {!activeConversation ? (
            <p style={{ padding: 12 }}>
              Crée une conversation pour commencer.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
