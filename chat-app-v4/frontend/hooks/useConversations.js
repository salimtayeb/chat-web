"use client";

import { useCallback, useEffect, useState } from "react";

function normalizeConversations(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.conversations)) return payload.conversations;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [errorConversations, setErrorConversations] = useState("");

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    setErrorConversations("");

    try {
      const res = await fetch("/api/conversations");
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorConversations(data?.error || "Impossible de charger les conversations");
        return;
      }

      const list = normalizeConversations(data);
      setConversations(list);

      // ✅ IMPORTANT : auto-sélectionner une conversation si aucune n'est active
      if (!activeConversation && list.length > 0) {
        setActiveConversation(list[0]);
      }
    } catch (e) {
      setErrorConversations("Impossible de contacter le serveur.");
    } finally {
      setLoadingConversations(false);
    }
  }, [activeConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(async () => {
    setErrorConversations("");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nouvelle conversation" }),
      });

      const created = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorConversations(created?.error || "Création impossible");
        return;
      }

      // created peut être {id,title,...} ou {conversation:{...}}
      const conv = created?.conversation || created;

      setConversations((prev) => [conv, ...prev]);
      setActiveConversation(conv); // ✅ IMPORTANT
    } catch (e) {
      setErrorConversations("Impossible de contacter le serveur.");
    }
  }, []);

  const deleteConversation = useCallback(async (id) => {
    if (!id) return;
    setErrorConversations("");

    // On prépare la mise à jour locale après suppression
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveConversation((prevActive) => {
      if (!prevActive || prevActive.id !== id) return prevActive;
      return null;
    });

    try {
      // Variante 1: DELETE /api/conversations?id=...
      let res = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      // Variante 2 (fallback): DELETE /api/conversations/{id}
      if (!res.ok) {
        res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorConversations(data?.error || "Suppression impossible");
        // reload pour remettre un état cohérent
        await fetchConversations();
        return;
      }

      // Si on vient de supprimer l’active, on choisit la 1ère restante
      setActiveConversation((prevActive) => {
        if (prevActive && prevActive.id !== id) return prevActive;
        const remaining = conversations.filter((c) => c.id !== id);
        return remaining[0] || null;
      });
    } catch (e) {
      setErrorConversations("Impossible de contacter le serveur.");
      await fetchConversations();
    }
  }, [conversations, fetchConversations]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    createConversation,
    deleteConversation,
    fetchConversations,
    loadingConversations,
    errorConversations,
  };
}
