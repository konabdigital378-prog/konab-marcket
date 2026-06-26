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
  images TEXT[] DEFAULT '{}',
  secteur TEXT NOT NULL,
  ville TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
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

-- Table favoris
CREATE TABLE IF NOT EXISTS favoris (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  annonce_id UUID REFERENCES annonces(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, annonce_id)
);

ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Favoris visibles par propriétaire" ON favoris;
DROP POLICY IF EXISTS "Favoris créables par auth" ON favoris;
DROP POLICY IF EXISTS "Favoris supprimables par propriétaire" ON favoris;

CREATE POLICY "Favoris visibles par propriétaire" ON favoris
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Favoris créables par auth" ON favoris
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Favoris supprimables par propriétaire" ON favoris
  FOR DELETE USING (auth.uid() = user_id);

-- Table messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  annonce_id UUID REFERENCES annonces(id) ON DELETE CASCADE NOT NULL,
  envoyeur_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  destinataire_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages visibles par participants" ON messages;
DROP POLICY IF EXISTS "Messages créables par auth" ON messages;
DROP POLICY IF EXISTS "Messages modifiables par participants" ON messages;

CREATE POLICY "Messages visibles par participants" ON messages
  FOR SELECT USING (auth.uid() = envoyeur_id OR auth.uid() = destinataire_id);

CREATE POLICY "Messages créables par auth" ON messages
  FOR INSERT WITH CHECK (auth.uid() = envoyeur_id);

CREATE POLICY "Messages modifiables par participants" ON messages
  FOR UPDATE USING (auth.uid() = envoyeur_id OR auth.uid() = destinataire_id);

-- Table livreurs (profils coursiers)
CREATE TABLE IF NOT EXISTS livreurs (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  disponible BOOLEAN DEFAULT TRUE,
  zone_couverture TEXT DEFAULT '',
  type_vehicule TEXT DEFAULT 'moto' CHECK (type_vehicule IN ('moto','velo','voiture','camion','pied')),
  tarif_base NUMERIC DEFAULT 1000,
  tarif_par_km NUMERIC DEFAULT 200,
  note_moyenne NUMERIC DEFAULT 5.0,
  total_livraisons INTEGER DEFAULT 0,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE livreurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Livreurs publics" ON livreurs;
DROP POLICY IF EXISTS "Livreurs modifiables" ON livreurs;
DROP POLICY IF EXISTS "Livreurs créables" ON livreurs;

CREATE POLICY "Livreurs publics" ON livreurs
  FOR SELECT USING (true);

CREATE POLICY "Livreurs modifiables" ON livreurs
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Livreurs créables" ON livreurs
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Table livraisons (commandes de livraison)
CREATE TABLE IF NOT EXISTS livraisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  annonce_id UUID REFERENCES annonces(id) ON DELETE SET NULL,
  acheteur_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  livreur_id UUID REFERENCES livreurs(id) ON DELETE SET NULL,
  adresse_ramassage TEXT NOT NULL,
  adresse_livraison TEXT NOT NULL,
  ville_ramassage TEXT NOT NULL,
  ville_livraison TEXT NOT NULL,
  contact_expediteur TEXT NOT NULL,
  contact_destinataire TEXT NOT NULL,
  description_colis TEXT DEFAULT '',
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','acceptee','en_cours','livree','annulee')),
  prix_estime NUMERIC DEFAULT 0,
  prix_final NUMERIC,
  photo_url TEXT,
  note_livreur INTEGER CHECK (note_livreur >= 1 AND note_livreur <= 5),
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE livraisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Livraisons visibles par participants" ON livraisons;
DROP POLICY IF EXISTS "Livraisons créables" ON livraisons;
DROP POLICY IF EXISTS "Livraisons modifiables par participants" ON livraisons;

CREATE POLICY "Livraisons visibles par participants" ON livraisons
  FOR SELECT USING (
    auth.uid() = acheteur_id OR
    auth.uid() = livreur_id OR
    EXISTS (SELECT 1 FROM annonces WHERE annonces.id = livraisons.annonce_id AND annonces.user_id = auth.uid())
  );

CREATE POLICY "Livraisons créables" ON livraisons
  FOR INSERT WITH CHECK (auth.uid() = acheteur_id);

CREATE POLICY "Livraisons modifiables par participants" ON livraisons
  FOR UPDATE USING (
    auth.uid() = acheteur_id OR
    auth.uid() = livreur_id
  );

-- Table signalements
CREATE TABLE IF NOT EXISTS signalements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  annonce_id UUID REFERENCES annonces(id) ON DELETE CASCADE NOT NULL,
  signalant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  motif TEXT NOT NULL CHECK (motif IN ('spam','fraude','contenu_inapproprie','produit_indisponible','autre')),
  description TEXT DEFAULT '',
  traite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signalements créables par auth" ON signalements;
DROP POLICY IF EXISTS "Signalements visibles par admin" ON signalements;

CREATE POLICY "Signalements créables par auth" ON signalements
  FOR INSERT WITH CHECK (auth.uid() = signalant_id);

CREATE POLICY "Signalements visibles par admin" ON signalements
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE id IN (SELECT id FROM profiles LIMIT 100)));

-- Table offres (négociation)
CREATE TABLE IF NOT EXISTS offres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  annonce_id UUID REFERENCES annonces(id) ON DELETE CASCADE NOT NULL,
  acheteur_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  montant NUMERIC NOT NULL,
  message TEXT DEFAULT '',
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','acceptee','refusee')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Offres visibles par participants" ON offres;
DROP POLICY IF EXISTS "Offres créables par auth" ON offres;
DROP POLICY IF EXISTS "Offres modifiables par vendeur" ON offres;

CREATE POLICY "Offres visibles par participants" ON offres
  FOR SELECT USING (auth.uid() = acheteur_id OR auth.uid() IN (SELECT user_id FROM annonces WHERE annonces.id = offres.annonce_id));

CREATE POLICY "Offres créables par auth" ON offres
  FOR INSERT WITH CHECK (auth.uid() = acheteur_id);

CREATE POLICY "Offres modifiables par vendeur" ON offres
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM annonces WHERE annonces.id = offres.annonce_id));

-- Table adresses (carnet d'adresses)
CREATE TABLE IF NOT EXISTS adresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  libelle TEXT DEFAULT 'Domicile',
  ville TEXT NOT NULL,
  adresse TEXT NOT NULL,
  telephone TEXT NOT NULL,
  instructions TEXT DEFAULT '',
  est_defaut BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE adresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Adresses visibles par proprietaire" ON adresses;
DROP POLICY IF EXISTS "Adresses créables par auth" ON adresses;
DROP POLICY IF EXISTS "Adresses modifiables par proprietaire" ON adresses;
DROP POLICY IF EXISTS "Adresses supprimables par proprietaire" ON adresses;

CREATE POLICY "Adresses visibles par proprietaire" ON adresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Adresses créables par auth" ON adresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Adresses modifiables par proprietaire" ON adresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Adresses supprimables par proprietaire" ON adresses
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_new_message BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_livraison BOOLEAN DEFAULT TRUE;

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('message','offre','livraison','signalement','abonnement','system')),
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  data JSONB DEFAULT '{}',
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications visibles par proprietaire" ON notifications;
DROP POLICY IF EXISTS "Notifications créables" ON notifications;
DROP POLICY IF EXISTS "Notifications modifiables par proprietaire" ON notifications;

CREATE POLICY "Notifications visibles par proprietaire" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Notifications créables" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Notifications modifiables par proprietaire" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_notifications_user_lu ON notifications(user_id, lu);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Fonction pour créer une notification facilement
CREATE OR REPLACE FUNCTION creer_notification(p_user_id UUID, p_type TEXT, p_title TEXT, p_body TEXT DEFAULT '', p_data JSONB DEFAULT '{}')
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajout colonnes géolocalisation (si tables déjà existantes)
ALTER TABLE annonces ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE annonces ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE annonces ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE livreurs ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE livreurs ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Fonction vues
CREATE OR REPLACE FUNCTION increment_vues(annonce_id UUID)
RETURNS VOID AS $$
  UPDATE annonces SET vues = vues + 1 WHERE id = annonce_id;
$$ LANGUAGE sql SECURITY DEFINER;
