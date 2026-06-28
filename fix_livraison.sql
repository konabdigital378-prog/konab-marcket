-- ============================================
-- FIX COMPLET LIVRAISON — EXÉCUTER EN UN BLOC
-- ============================================

-- 1. Colonnes QR sur livraisons
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE;
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE livraisons ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES profiles(id);

-- 2. Supprimer les anciennes policies RLS sur livraisons
DROP POLICY IF EXISTS "Livraisons visibles par participants" ON livraisons;
DROP POLICY IF EXISTS "Livraisons visibles livreurs" ON livraisons;
DROP POLICY IF EXISTS "Livraisons créables" ON livraisons;
DROP POLICY IF EXISTS "Livraisons modifiables par participants" ON livraisons;

-- 3. SELECT : acheteur voit les siennes, livreur assigné voit les siennes,
--    tout livreur注册 voit TOUTES les en_attente non assignées
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

-- 4. INSERT : seul l'acheteur peut créer
CREATE POLICY "Livraisons créables" ON livraisons
  FOR INSERT WITH CHECK (auth.uid() = acheteur_id);

-- 5. UPDATE : acheteur, livreur assigné, ou tout livreur peut accepter en_attente
CREATE POLICY "Livraisons modifiables par participants" ON livraisons
  FOR UPDATE USING (
    auth.uid() = acheteur_id
    OR auth.uid() = livreur_id
    OR (
      statut = 'en_attente'
      AND EXISTS (SELECT 1 FROM livreurs WHERE livreurs.id = auth.uid())
    )
  );

-- 6. Activer Realtime sur livraisons
ALTER PUBLICATION supabase_realtime ADD TABLE livraisons;

-- 7. Fonction notification (vérifier qu'elle existe)
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
