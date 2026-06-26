import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Store, MapPin, Star, Package, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';

export default function VendeurPage({ vendeurId, onBack, onShowDetail }) {
  const [vendeur, setVendeur] = useState(null);
  const [annonces, setAnnonces] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: profil } = await supabase.from('profiles').select('*').eq('id', vendeurId).single();
      if (profil) setVendeur(profil);

      const { data: anns } = await supabase.from('annonces')
        .select('*, profiles(nom, entreprise_nom, certifie, abonnement)')
        .eq('user_id', vendeurId).eq('actif', true)
        .order('created_at', { ascending: false });
      if (anns) setAnnonces(anns);

      const { count: total } = await supabase.from('annonces')
        .select('*', { count: 'exact', head: true }).eq('user_id', vendeurId).eq('actif', true);
      setStats({ total: total || 0 });

      setLoading(false);
    }
    load();
  }, [vendeurId]);

  if (loading) {
    return (
      <div className="page">
        <div className="detail-skeleton">
          <div className="skeleton-block" style={{ height: 120, borderRadius: 'var(--radius)', marginBottom: 24 }} />
          <SkeletonCards count={3} />
        </div>
      </div>
    );
  }

  if (!vendeur) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>Vendeur introuvable</h3>
          <p>Ce profil n'existe pas.</p>
          <motion.button className="btn btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
            <ArrowLeft size={18} /> Retour
          </motion.button>
        </div>
      </div>
    );
  }

  const initials = (vendeur.nom || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="page">
      <motion.button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
        <ArrowLeft size={18} /> Retour
      </motion.button>

      <motion.div className="vendeur-profile-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="vendeur-profile-banner" />
        <div className="vendeur-profile-content">
          <div className="vendeur-avatar-large">{initials}</div>
          <div className="vendeur-profile-info">
            <h1 className="vendeur-name">{vendeur.entreprise_nom || vendeur.nom}</h1>
            <div className="vendeur-badges">
              {vendeur.certifie && <span className="badge badge-gold"><Star size={12} /> Certifié</span>}
              <span className={`badge ${vendeur.abonnement === 'premium' ? 'badge-gold' : vendeur.abonnement === 'certified' ? 'badge-vert' : 'badge-default'}`}>
                {vendeur.abonnement === 'certified' ? 'Certifié Entreprise' : vendeur.abonnement === 'premium' ? 'Premium' : 'Gratuit'}
              </span>
            </div>
            <div className="vendeur-stats-row">
              <div className="vendeur-stat-item">
                <Package size={16} />
                <span>{stats.total} annonces</span>
              </div>
              {vendeur.secteur && (
                <div className="vendeur-stat-item">
                  <Store size={16} />
                  <span>{vendeur.secteur}</span>
                </div>
              )}
              {vendeur.ville && (
                <div className="vendeur-stat-item">
                  <MapPin size={16} />
                  <span>{vendeur.ville}</span>
                </div>
              )}
              <div className="vendeur-stat-item">
                <Calendar size={16} />
                <span>Membre depuis {new Date(vendeur.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {vendeur.bio && (
        <motion.div className="card-surface" style={{ marginTop: 24, padding: 20 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3 style={{ marginBottom: 8, color: 'white', fontSize: 15 }}>À propos</h3>
          <p style={{ color: 'var(--text2)', lineHeight: 1.7, fontSize: 14 }}>{vendeur.bio}</p>
        </motion.div>
      )}

      <motion.div className="section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="section-header">
          <div className="section-title">
            <div className="section-title-bar" />
            <Package size={20} /> Annonces de {vendeur.entreprise_nom || vendeur.nom || 'ce vendeur'}
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)', marginLeft: 8 }}>({annonces.length})</span>
          </div>
        </div>

        {annonces.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="icon"><Package size={48} /></div>
            <h3>Aucune annonce pour le moment</h3>
            <p style={{ color: 'var(--text3)' }}>Ce vendeur n'a pas encore publié d'annonces.</p>
          </div>
        ) : (
          <div className="cards-grid">
            {annonces.map(a => (
              <AnnonceCard key={a.id} annonce={a} onClick={onShowDetail} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
