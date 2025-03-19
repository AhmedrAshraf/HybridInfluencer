"use client";

import { supabase } from "@/utils/supabase";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserType {
  id: string;
  uuid: string;
  created_at: string;
  email: string;
  name: string;
  status: string;
  role: string;
  avatar: string;
  instagramUrl: string;
  tiktokUrl: string;
  bio?: string;
  username?: string;
}

interface ContextType {
  user: UserType | null;
  loading: boolean;
}

const Context = createContext<ContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      const { data: influencerData, error: influencerError } = await supabase
        .from("influencers")
        .select("*")
        .eq("uuid", userId)
        .single();

      if (influencerError || !influencerData) {
        setUser(null);
      } else {
        setUser(influencerData as UserType);
      }

      setLoading(false);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Context.Provider value={{ user, loading }}>
      {children}
    </Context.Provider>
  );
};

export const useApp = (): ContextType => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useApp must be used within a CartProvider");
  }
  return context;
};
