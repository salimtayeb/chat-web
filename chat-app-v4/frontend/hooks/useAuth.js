"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
/* ✅ AJOUT */
import { useRouter } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState("");

  /* ✅ AJOUT */
  const router = useRouter();

  useEffect(() => {
    // 1) Récupérer la session au chargement
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message);
      setUser(data?.session?.user || null);
      setLoadingAuth(false);
    });

    // 2) Écouter les changements de session (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  async function signUp(email, password) {
    setAuthError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      return false;
    }
    return true;
  }

  async function signIn(email, password) {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return false;
    }
    /* ✅ AJOUT : met à jour l’UI immédiatement */
    router.refresh();
    return true;
  }

  /* ✅ MODIF MINIMALE (sans enlever) :
     - ajoute un param optionnel redirectTo
     - setUser(null) immédiat
     - refresh + redirection */
  async function signOut(redirectTo = "/login") {
    setAuthError("");

    // ✅ UI instantanée
    setUser(null);

    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      return false;
    }

    // ✅ force la mise à jour des composants/route
    router.refresh();

    // ✅ redirection (désactive si tu passes null/false)
    if (redirectTo) {
      router.replace(redirectTo);
    }

    return true;
  }

  return { user, loadingAuth, authError, signUp, signIn, signOut };
}