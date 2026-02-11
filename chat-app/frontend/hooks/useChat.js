"use client";

import { useEffect, useRef, useState } from "react";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatRef = useRef(null);

  async function loadMessages() {
    setError("");
    const res = await fetch("/api/messages");
    const data = await res.json();

    if (!res.ok) {
      setError(data?.error || "Impossible de charger l'historique");
      return;
    }

    setMessages(data.messages || []);
  }

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setError("");
    setLoading(true);

    // Affichage immédiat du message utilisateur (optimistic UI)
    const optimistic = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Erreur lors de l'envoi");
        await loadMessages();
        return;
      }

      await loadMessages();
    } catch (e) {
      setError("Impossible de contacter le serveur.");
      await loadMessages();
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
  };
}
