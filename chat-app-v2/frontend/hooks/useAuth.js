"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState("");

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
    return true;
  }

  async function signOut() {
    setAuthError("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      return false;
    }
    return true;
  }

  return { user, loadingAuth, authError, signUp, signIn, signOut };
}
