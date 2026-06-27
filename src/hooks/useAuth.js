import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, ADMIN_EMAIL } from '../supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === ADMIN_EMAIL;

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).single();
      if (!error && data) setProfile(data);
    } catch (_) {}
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Petit délai pour laisser le trigger créer le profil
        setTimeout(() => loadProfile(session.user.id), 500);
      } else {
        setProfile(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // INSCRIPTION — passe nom+telephone dans les metadata Supabase
  // Le trigger SQL les lit et crée le profil automatiquement
  async function signUp(email, password, nom, telephone, avatarUrl) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nom, telephone, avatar_url: avatarUrl || '' }
      }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  const maxAnnonces = () => {
    if (!profile) return 10;
    if (profile.abonnement === 'certified') return 200;
    if (profile.abonnement === 'premium')   return 50;
    return 10;
  };

  const abonnementActif = () => {
    if (!profile?.abonnement_expire) return profile?.abonnement === 'basic';
    return new Date(profile.abonnement_expire) > new Date();
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, isAdmin,
      signUp, signIn, signOut, refreshProfile,
      maxAnnonces, abonnementActif
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
