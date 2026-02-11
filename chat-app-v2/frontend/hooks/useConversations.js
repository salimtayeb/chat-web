"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || "";
  }

  async function loadConversations() {
    setLoading(true);
    setError("");

    const token = await getAccessToken();
    const res = await fetch("/api/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data?.error || "Erreur chargement conversations");
      setLoading(false);
      return;
    }

    setConversations(data.conversations || []);

    if (!activeConversation && data.conversations?.length > 0) {
      setActiveConversation(data.conversations[0]);
    }

    setLoading(false);
  }

  async function createConversation() {
    const token = await getAccessToken();
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Erreur création conversation");
      return;
    }

    setConversations((prev) => [data.conversation, ...prev]);
    setActiveConversation(data.conversation);
  }

  async function deleteConversation(id) {
    const token = await getAccessToken();
    await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    createConversation,
    deleteConversation,
    loading,
    error,
  };
}
