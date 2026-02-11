"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const chatRef = useRef(null);

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || "";
  }

  const loadMessagesForConversation = useCallback(async (convId) => {
    if (!convId) return;
    setError("");

    const token = await getAccessToken();

    const res = await fetch(`/api/messages?conversationId=${encodeURIComponent(convId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data?.error || "Impossible de charger l'historique");
      return;
    }

    setMessages(data.messages || []);
  }, []);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    if (!conversationId) {
      setError("Aucune conversation sélectionnée.");
      return;
    }

    setError("");
    setLoading(true);

    // Optimistic UI (affichage immédiat)
    const optimistic = {
      id: Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      conversation_id: conversationId,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const token = await getAccessToken();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, conversationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Erreur lors de l'envoi");
        await loadMessagesForConversation(conversationId);
        return;
      }

      await loadMessagesForConversation(conversationId);
    } catch (e) {
      setError("Impossible de contacter le serveur.");
      await loadMessagesForConversation(conversationId);
    } finally {
      setLoading(false);
    }
  }

  return {
    messages,
    input,
    setInput,
    sendMessage,
    loading,
    error,
    chatRef,
    conversationId,
    setConversationId,
    loadMessagesForConversation,
  };
}
