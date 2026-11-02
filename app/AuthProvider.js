"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensurePocketBase, PB_URLS, pb } from "@/lib/pb";
import { STAFF_COLLECTION } from "@/lib/auth";

const AuthContext = createContext({
  user: null,
  loading: true,
  ready: false,
  login: async () => {},
  logout: () => {},
});

function currentUser() {
  if (pb.authStore.isValid && pb.authStore.record) {
    return pb.authStore.record;
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const sync = () => {
      if (!alive) return;
      setUser(currentUser());
      setLoading(false);
    };
    const unsub = pb.authStore.onChange(sync);
    ensurePocketBase()
      .finally(() => {
        if (alive) setReady(true);
        sync();
      });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      ready,
      login: async (username, password) => {
        const rawIdentity = String(username || "").trim();
        const secret = String(password || "")
          .trim()
          .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit).toString());
        const identities = [rawIdentity.toLowerCase(), rawIdentity].filter(
          (value, index, list) => value && list.indexOf(value) === index,
        );
        await ensurePocketBase();
        const urls = [pb.baseUrl, ...PB_URLS].filter(
          (url, index, list) => url && list.indexOf(url) === index,
        );
        let lastError;
        for (const url of urls) {
          pb.baseUrl = url;
          for (const identity of identities) {
            try {
              const auth = await pb.collection(STAFF_COLLECTION).authWithPassword(identity, secret);
              setUser(auth.record);
              return auth.record;
            } catch (err) {
              lastError = err;
            }
          }
        }
        throw lastError;
      },
      logout: () => {
        pb.authStore.clear();
        setUser(null);
      },
    }),
    [user, loading, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useLogout() {
  const { logout } = useAuth();
  const router = useRouter();
  return () => {
    logout();
    router.replace("/");
  };
}
