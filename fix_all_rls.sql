-- FIX COMPLET LIVRAISONS + NOTIFICATIONS
-- Copier-coller dans Supabase SQL Editor et Exécuter

-- 1. DROP ancientes policies
DROP POLICY IF EXISTS "Livraisons visibles par participants" ON livraisons;
DROP POLICY IF EXISTS "Livraisons visibles livreurs" ON livraisons;
DROP POLICY IF EXISTS "Livraisons créables" ON livraisons;
DROP POLICY IF EXISTS "Livraisons modifiables par participants" ON livraisons;

-- 2. SELECT: l'acheteur voit ses demandes, le livreur voit les siennes, tous les livreurs voient les en_attente
CREATE POLICY "Livraisons SELECT" ON livraisons
  FOR SELECT USING (
    auth.uid() = acheteur_id
    OR auth.uid() = livreur_id
    OR (
      statut = 'en_attente'
      AND livreur_id IS NULL
      AND EXISTS (SELECT 1 FROM livreurs WHERE livreurs.id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM livreurs WHERE livreurs.id = auth.uid())
  );

-- 3. INSERT: seul l'acheteur peut créer
CREATE POLICY "Livraisons INSERT" ON livraisons
  FOR INSERT WITH CHECK (auth.uid() = acheteur_id);

-- 4. UPDATE: acheteur ou livreur peut modifier
CREATE POLICY "Livraisons UPDATE" ON livraisons
  FOR UPDATE USING (
    auth.uid() = acheteur_id
    OR auth.uid() = livreur_id
    OR (
      statut = 'en_attente'
      AND EXISTS (SELECT 1 FROM livreurs WHERE livreurs.id = auth.uid())
    )
  );

-- 5. Notifications: tout le monde peut lire, l'application peut écrire
DROP POLICY IF EXISTS "Notifications créables" ON notifications;
DROP POLICY IF EXISTS "Notifications lisibles" ON notifications;

CREATE POLICY "Notifications INSERT" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Notifications SELECT" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Fonction notification SECURITY DEFINER
CREATE OR REPLACE FUNCTION creer_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT '',
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
