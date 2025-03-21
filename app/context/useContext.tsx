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

interface Establish {
  id: string;
  uid: string;
  created_at: string;
  email: string;
  name: string;
  businessDetail: string;
  offer: string;
  role: string;
  category: string;
  trending: string;
  isNew: string;
  // instagramUrl: string;
  // tiktokUrl: string;
  // bio?: string;
  // username?: string;
}

interface ContextType {
  user: UserType | null;
  establishers: Establish[];
  loading: boolean;
  reservations: string[];
  conversations: string[];
  setConversations: string[];
  fetchEstablishments: () => void;
  fetchReservations: () => void;
  fetchConversations: () => void;
  fetchFavorites: () => void;
}

const Context = createContext<ContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [establishers, setEstablishers] = useState<Establish[] | []>([]);
  const [reservations, setReservations] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [favorites, setFavorites] = useState([]);

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

  const fetchEstablishments = async () => {
    const { data: establisherData, error: establisherError } = await supabase
        .from("establishers")
        .select("*")

      if (establisherError || !establisherData) {
        setEstablishers(null);
      } else {
        setEstablishers(establisherData as Establish);
      }
  }

  const fetchReservations = async () => {
    const { data: reserveData, error: reserverError } = await supabase
        .from("reservations")
        .select("*")
        .eq("userId", user?.uuid)

      if (reserverError || !reserveData) {
        setReservations(null);
      } else {
        setReservations(reserveData);
      }
  }

  const fetchConversations = async () => {
    const { data: conversationData, error: conversationError } = await supabase
        .from("conversations")
        .select("*")

      if (conversationError || !conversationData) {
        setConversations(null);
      } else {
        setConversations(conversationData);
      }
  }

  const fetchFavorites = async () => {
    const { data: favoritesData, error: favoritesError } = await supabase
        .from("favorites")
        .select('place_id')
        .eq('user_id', user?.uuid)

      if (favoritesError || !favoritesData) {
        setFavorites(null);
      } else {
        setFavorites(favoritesData);
      }
  }

  return (
    <Context.Provider value={{ user, loading, establishers, reservations, conversations, setConversations, fetchConversations, fetchEstablishments, fetchReservations, fetchFavorites }}>
      {children}
    </Context.Provider>
  );
};

export const useApp = (): ContextType => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useApp must be used within a appProvider");
  }
  return context;
};
