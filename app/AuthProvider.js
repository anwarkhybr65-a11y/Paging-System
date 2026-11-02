"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pb";
import { STAFF_COLLECTION } from "@/lib/auth";

const AuthContext = createContext({
  user: null,
  loading: true,
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

  useEffect(() => {
    const sync = () => {
      setUser(currentUser());
      setLoading(false);
    };
    sync();
    return pb.authStore.onChange(sync);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (username, password) => {
        const auth = await pb.collection(STAFF_COLLECTION).authWithPassword(username.trim(), password);
        setUser(auth.record);
        return auth.record;
      },
      logout: () => {
        pb.authStore.clear();
        setUser(null);
      },
    }),
    [user, loading],
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
