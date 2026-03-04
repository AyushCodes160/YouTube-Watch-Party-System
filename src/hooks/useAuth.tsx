import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  email?: string;
  user_metadata?: { username?: string };
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
    // Check local storage for mocked user session
    const storedUser = localStorage.getItem('watch_party_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setSession({ user: parsedUser });
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    const newUser = {
      id: uuidv4(),
      email,
      user_metadata: { username: username || email.split('@')[0] }
    };
    localStorage.setItem('watch_party_user', JSON.stringify(newUser));
    setUser(newUser);
    setSession({ user: newUser });
    return { error: null };
  };

  const signIn = async (email: string, _password: string) => {
    // Fake login
    const newUser = {
      id: uuidv4(),
      email,
      user_metadata: { username: email.split('@')[0] }
    };
    localStorage.setItem('watch_party_user', JSON.stringify(newUser));
    setUser(newUser);
    setSession({ user: newUser });
    return { error: null };
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
