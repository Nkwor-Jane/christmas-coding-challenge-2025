import { Platform } from "react-native";
import { create } from "zustand";

const KEY = "reading.session";

export type Reader = {
  id: string;
  email: string;
  full_name: string;
};

type AuthState = {
  token: string | null;
  user: Reader | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (token: string, user: Reader) => void;
  clear: () => void;
};

function readStored(): { token: string; user: Reader } | null {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { token: string; user: Reader };
  } catch {
    return null;
  }
}

function writeStored(value: { token: string; user: Reader } | null) {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  if (value) localStorage.setItem(KEY, JSON.stringify(value));
  else localStorage.removeItem(KEY);
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    const saved = readStored();
    set({ token: saved?.token ?? null, user: saved?.user ?? null, hydrated: true });
  },
  setSession: (token, user) => {
    writeStored({ token, user });
    set({ token, user, hydrated: true });
  },
  clear: () => {
    writeStored(null);
    set({ token: null, user: null, hydrated: true });
  },
}));
