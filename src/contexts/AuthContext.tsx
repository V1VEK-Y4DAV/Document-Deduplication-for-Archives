import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logActivity } from "@/utils/activityLogger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Log login activity
      if (event === 'SIGNED_IN' && session?.user) {
        logActivity({
          userId: session.user.id,
          action: "User Logged In",
          entityType: "auth",
          details: {
            email: session.user.email,
            timestamp: new Date().toISOString(),
            result: "Successfully logged in"
          }
        });
      }
      
      // Log logout activity
      if (event === 'SIGNED_OUT') {
        // We need to get the user ID before logout if available
        if (user?.id) {
          logActivity({
            userId: user.id,
            action: "User Logged Out",
            entityType: "auth",
            details: {
              timestamp: new Date().toISOString(),
              result: "Successfully logged out"
            }
          });
        }
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Log signup activity
    if (!error) {
      // Note: User ID will be available after email confirmation
      logActivity({
        userId: "unknown", // Will be updated after confirmation
        action: "User Signup Initiated",
        entityType: "auth",
        details: {
          email: email,
          fullName: fullName,
          timestamp: new Date().toISOString(),
          result: "Signup initiated, pending email confirmation"
        }
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    // Log logout activity before signing out
    if (user?.id) {
      await logActivity({
        userId: user.id,
        action: "User Logged Out",
        entityType: "auth",
        details: {
          timestamp: new Date().toISOString(),
          result: "Successfully logged out"
        }
      });
    }
    
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};