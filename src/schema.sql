-- ============================================
-- SCHEMA BURKINAMARKET v2 — À EXÉCUTER COMPLET
-- ============================================

-- Nettoyage (si re-exécution)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS increment_vues(UUID);

-- Table profils
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nom TEXT,
  telephone TEXT,
  ville TEXT,
  secteur TEXT,
  abonnement TEXT DEFAULT 'basic',
  abonnement_expire TIMESTAMPTZ,
  entreprise_nom TEXT,
  entreprise_logo TEXT,
  certifie BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table annonces
CREATE TABLE IF NOT EXISTS annonces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('offre','emploi','formation','article','recherche')),
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  prix NUMERIC,
  devise TEXT DEFAULT 'FCFA',
  date_fin DATE,
  whatsapp TEXT NOT NULL,
  affiche_url TEXT,
  secteur TEXT NOT NULL,
  ville TEXT,
  actif BOOLEAN DEFAULT TRUE,
  vues INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table paiements
CREATE TABLE IF NOT EXISTS paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  formule TEXT NOT NULL,
  montant INTEGER NOT NULL,
  capture_url TEXT,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','valide','refuse')),
  valide_par UUID REFERENCES profiles(id),
  valide_le TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- PROFILS: lecture publique limitée pour les annonces (nom entreprise)
DROP POLICY IF EXISTS "Profils visibles par propriétaire" ON profiles;
DROP POLICY IF EXISTS "Profils modifiables par propriétaire" ON profiles;
DROP POLICY IF EXISTS "Profils créables" ON profiles;
DROP POLICY IF EXISTS "Profils publics limités" ON profiles;

CREATE POLICY "Profils visibles par propriétaire" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profils modifiables par propriétaire" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- INSERT: SECURITY DEFINER via trigger, pas de policy INSERT nécessaire
-- mais on laisse pour le fallback direct
CREATE POLICY "Profils créables" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ANNONCES
DROP POLICY IF EXISTS "Annonces publiques" ON annonces;
DROP POLICY IF EXISTS "Annonces créables par auth" ON annonces;
DROP POLICY IF EXISTS "Annonces modifiables par propriétaire" ON annonces;
DROP POLICY IF EXISTS "Annonces supprimables par propriétaire" ON annonces;
DROP POLICY IF EXISTS "Annonces owner select" ON annonces;

CREATE POLICY "Annonces publiques" ON annonces
  FOR SELECT USING (actif = TRUE OR auth.uid() = user_id);

CREATE POLICY "Annonces créables par auth" ON annonces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Annonces modifiables par propriétaire" ON annonces
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Annonces supprimables par propriétaire" ON annonces
  FOR DELETE USING (auth.uid() = user_id);

-- PAIEMENTS
DROP POLICY IF EXISTS "Paiements par propriétaire" ON paiements;
DROP POLICY IF EXISTS "Paiements créables" ON paiements;

CREATE POLICY "Paiements par propriétaire" ON paiements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Paiements créables" ON paiements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('annonces', 'annonces', TRUE) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('captures', 'captures', FALSE) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Images annonces publiques" ON storage.objects;
DROP POLICY IF EXISTS "Upload annonces par auth" ON storage.objects;
DROP POLICY IF EXISTS "Upload captures par auth" ON storage.objects;

CREATE POLICY "Images annonces publiques" ON storage.objects
  FOR SELECT USING (bucket_id = 'annonces');

CREATE POLICY "Upload annonces par auth" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'annonces' AND auth.role() = 'authenticated');

CREATE POLICY "Upload captures par auth" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'captures' AND auth.role() = 'authenticated');

-- TRIGGER: crée profil avec nom+telephone depuis metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, telephone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'telephone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    nom = COALESCE(EXCLUDED.nom, profiles.nom),
    telephone = COALESCE(EXCLUDED.telephone, profiles.telephone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fonction vues
CREATE OR REPLACE FUNCTION increment_vues(annonce_id UUID)
RETURNS VOID AS $$
  UPDATE annonces SET vues = vues + 1 WHERE id = annonce_id;
$$ LANGUAGE sql SECURITY DEFINER;
