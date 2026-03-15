import { createContext, useContext, useEffect, useState, ReactNode } from 'react';



const SERVER_URL = import.meta.env.VITE_BACKEND_URL || '';

interface User {
  _id: string;
  email?: string;
  username?: string;
  token?: string;
}

interface AuthContextType {
  session: any | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    const storedUser = localStorage.getItem('watch_party_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setSession({ user: parsedUser });
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username: username || email.split('@')[0] })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      
      localStorage.setItem('watch_party_user', JSON.stringify(data));
      setUser(data);
      setSession({ user: data });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('watch_party_user', JSON.stringify(data));
      setUser(data);
      setSession({ user: data });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('watch_party_user');
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (_email: string) => {
    
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
