import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, ShoppingBag } from 'lucide-react';
import { supabase, SECTEURS } from '../supabase';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';

const SECTEUR_ICONS = {
  'Agriculture & Élevage': '🌾', 'Artisanat & Arts': '🎨', 'Bâtiment & Construction': '🏗️',
  'Commerce & Distribution': '🛒', 'Éducation & Formation': '📚', 'Emploi & Recrutement': '💼',
  'Informatique & Tech': '💻', 'Immobilier': '🏠', 'Santé & Bien-être': '🏥',
  'Services à domicile': '🏡', 'Restauration & Alimentation': '🍽️', 'Transport & Logistique': '🚚',
  'Mode & Beauté': '👗', 'Événementiel': '🎉', 'Juridique & Conseil': '⚖️',
  'Finance & Assurance': '💰', 'Énergie & Environnement': '☀️', 'Tourisme & Loisirs': '✈️',
  'Médias & Communication': '📺', 'Autres': '📦',
};

export default function CategoriesPage({ onShowDetail }) {
  const [selectedSecteur, setSelectedSecteur] = useState('');
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    async function loadCounts() {
      const results = {};
      for (const s of SECTEURS) {
        const { count } = await supabase.from('annonces')
          .select('*', { count: 'exact', head: true })
          .eq('actif', true).eq('secteur', s);
        if (count > 0) results[s] = count;
      }
      setCounts(results);
    }
    loadCounts();
  }, []);

  useEffect(() => {
    if (!selectedSecteur) { setAnnonces([]); return; }
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('annonces')
        .select('*, profiles(nom, entreprise_nom, certifie, abonnement)')
        .eq('actif', true).eq('secteur', selectedSecteur)
        .order('created_at', { ascending: false }).limit(40);
      if (data) setAnnonces(data);
      setLoading(false);
    }
    load();
  }, [selectedSecteur]);

  return (
    <div className="page">
      <motion.div className="categories-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1><Search size={24} style={{ display: 'inline', marginRight: 10 }} /> Catégories</h1>
        <p style={{ color: 'var(--text2)', fontSize: 15 }}>Explorez les annonces par secteur d'activité</p>
      </motion.div>

      {!selectedSecteur ? (
        <motion.div className="categories-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {SECTEURS.filter(s => counts[s] > 0 || counts[s] === undefined).map(s => (
            <motion.div key={s} className="categorie-card"
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSecteur(s)}
            >
              <div className="categorie-icon">{SECTEUR_ICONS[s] || '📦'}</div>
              <div className="categorie-name">{s}</div>
              <div className="categorie-count">{counts[s] || 0} annonces</div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <motion.button className="btn btn-ghost btn-sm"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedSecteur('')}>
              <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Toutes les catégories
            </motion.button>
            <div className="section-title" style={{ marginBottom: 0 }}>
              <div className="section-title-bar" />
              {SECTEUR_ICONS[selectedSecteur] || '📦'} {selectedSecteur}
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)', marginLeft: 8 }}>({annonces.length})</span>
            </div>
          </div>

          {loading ? (
            <SkeletonCards count={6} />
          ) : annonces.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><ShoppingBag size={60} /></div>
              <h3>Aucune annonce dans cette catégorie</h3>
              <p>Soyez le premier à publier !</p>
            </div>
          ) : (
            <div className="cards-grid">
              {annonces.map(a => (
                <AnnonceCard key={a.id} annonce={a} onClick={onShowDetail} showFavoriBtn />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}