-- FIX NOTIFICATIONS + LIVRAISONS
-- Exécuter dans Supabase SQL Editor

-- 1. Fix RLS notifications : laisser SECURITY DEFINER fonctionner
DROP POLICY IF EXISTS "Notifications créables" ON notifications;
CREATE POLICY "Notifications créables" ON notifications
  FOR INSERT WITH CHECK (true);

-- 2. Fix RLS livraisons (tout livreur voit tout)
DROP POLICY IF EXISTS "Livraisons visibles par participants" ON livraisons;
DROP POLICY IF EXISTS "Livraisons visibles livreurs" ON livraisons;
DROP POLICY IF EXISTS "Livraisons créables" ON livraisons;
DROP POLICY IF EXISTS "Livraisons modifiables par participants" ON livraisons;

CREATE POLICY "Livraisons visibles par participants" ON livraisons
  FOR SELECT USING (
    auth.uid() = acheteur_id
    OR auth.uid() = livreur_id
    OR EXISTS (
      SELECT 1 FROM annonces
      WHERE annonces.id = livraisons.annonce_id
        AND annonces.user_id = auth.uid()
    )
  );

CREATE POLICY "Livraisons visibles livreurs" ON livraisons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM livreurs WHERE livreurs.id = auth.uid())
  );

CREATE POLICY "Livraisons créables" ON livraisons
  FOR INSERT WITH CHECK (auth.uid() = acheteur_id);

CREATE POLICY "Livraisons modifiables par participants" ON livraisons
  FOR UPDATE USING (
    auth.uid() = acheteur_id
    OR auth.uid() = livreur_id
    OR (
      statut = 'en_attente'
      AND EXISTS (SELECT 1 FROM livreurs WHERE livreurs.id = auth.uid())
    )
  );

-- 3. Ajouter colonnes QR si manquantes
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE;
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES profiles(id);

-- 4. Recréer la fonction notification (SECURITY DEFINER = bypass RLS)
CREATE OR REPLACE FUNCTION creer_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT '',
  p_data JSONB DEFAULT '{}'
)
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
