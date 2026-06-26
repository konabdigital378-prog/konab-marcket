import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Sparkles, TrendingUp, Package, Store, Briefcase, X, Plus, User } from 'lucide-react';
import { supabase, SECTEURS, TYPE_ANNONCE } from '../supabase';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';
import { FadeIn } from '../hooks/useFadeIn';
import { useAuth } from '../hooks/useAuth';

const VILLES_SEARCH = ['Toutes les villes', 'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Kaya', 'Tenkodogo', 'Fada N\'Gourma', 'Dédougou'];

const SECTEUR_ICONS = {
  'Agriculture & Élevage': '🌾', 'Artisanat & Arts': '🎨', 'Bâtiment & Construction': '🏗️',
  'Commerce & Distribution': '🛒', 'Éducation & Formation': '📚', 'Emploi & Recrutement': '💼',
  'Informatique & Tech': '💻', 'Immobilier': '🏠', 'Santé & Bien-être': '🏥',
  'Services à domicile': '🏡', 'Restauration & Alimentation': '🍽️', 'Transport & Logistique': '🚚',
  'Mode & Beauté': '👗', 'Événementiel': '🎉', 'Juridique & Conseil': '⚖️',
  'Finance & Assurance': '💰', 'Énergie & Environnement': '☀️', 'Tourisme & Loisirs': '✈️',
  'Médias & Communication': '📺', 'Autres': '📦',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function HomePage({ onShowAuth, onShowCreate, onShowDetail, onShowVendeur, searchQuery: externalSearch }) {
  const [annonces, setAnnonces] = useState([]);
  const [stats, setStats] = useState({ total: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(externalSearch || '');
  const [searchInput, setSearchInput] = useState(externalSearch || '');
  const [filterType, setFilterType] = useState('');
  const [filterSecteur, setFilterSecteur] = useState('');
  const [filterVille, setFilterVille] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const { user } = useAuth();

  const fetchAnnonces = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('annonces')
        .select('*, profiles(nom, entreprise_nom, certifie, abonnement)')
        .eq('actif', true);

      if (sortBy === 'created_at') {
        q = q.order('created_at', { ascending: false });
      } else if (sortBy === 'vues') {
        q = q.order('vues', { ascending: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'prix_asc') {
        q = q.order('prix', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'prix_desc') {
        q = q.order('prix', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
      }

      if (filterType)    q = q.eq('type', filterType);
      if (filterSecteur) q = q.eq('secteur', filterSecteur);
      if (filterVille && filterVille !== 'Toutes les villes') q = q.ilike('ville', `%${filterVille}%`);
      if (search)        q = q.or(`titre.ilike.%${search}%,description.ilike.%${search}%,secteur.ilike.%${search}%`);

      const { data, error } = await q.limit(80);
      if (!error) setAnnonces(data || []);
    } catch (_) {}
    setLoading(false);
  }, [filterType, filterSecteur, filterVille, search, sortBy]);

  useEffect(() => { fetchAnnonces(); }, [fetchAnnonces]);

  useEffect(() => {
    async function fetchStats() {
      const [{ count: total }, { count: users }] = await Promise.all([
        supabase.from('annonces').select('*', { count: 'exact', head: true }).eq('actif', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ total: total || 0, users: users || 0 });
    }
    fetchStats();
  }, []);

  function doSearch() { setSearch(searchInput); }

  async function handleInterest(id) {
    try { await supabase.rpc('increment_vues', { annonce_id: id }); } catch (_) {}
  }

  return (
    <div>
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-bg-gradient" />
          <div className="hero-grid" />
          <div className="hero-globe" />
        </div>

        <div className="hero-content">
          <div className="hero-text">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="hero-kicker">
                <Sparkles size={14} /> Marketplace 100% Burkinabè
              </div>
            </motion.div>

            <motion.h1 className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Achetez mieux · <span className="gradient-vert">Vendez plus</span><br />
              <span className="gradient-or">Partout dans le monde</span>
            </motion.h1>

            <motion.p className="hero-sub"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              La marketplace intelligente qui connecte acheteurs et vendeurs du Burkina Faso au monde entier. 
              Services, produits, emplois, formations — tout en un clic.
            </motion.p>

            <motion.div className="hero-actions"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {user ? (
                <motion.button className="btn btn-primary btn-xl"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onShowCreate}
                >
                  <Store size={20} /> Publier une annonce
                </motion.button>
              ) : (
                <>
                  <motion.button className="btn btn-primary btn-xl"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onShowAuth}
                  >
                    <Sparkles size={20} /> Commencer à vendre
                  </motion.button>
                  <motion.button className="btn btn-outline btn-xl"
                    whileHover={{ scale: 1.03, borderColor: 'var(--vert)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => document.getElementById('annonces-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Découvrir les produits <ArrowRight size={18} />
                  </motion.button>
                </>
              )}
            </motion.div>

            <motion.div className="hero-stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div>
                <div className="hero-stat-value">{stats.total}+</div>
                <div className="hero-stat-label">Annonces actives</div>
              </div>
              <div>
                <div className="hero-stat-value">{stats.users}+</div>
                <div className="hero-stat-label">Vendeurs</div>
              </div>
              <div>
                <div className="hero-stat-value">20</div>
                <div className="hero-stat-label">Secteurs</div>
              </div>
              <div>
                <div className="hero-stat-value">Globe</div>
                <div className="hero-stat-label">Livraison monde</div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="hero-card">
              <h3 className="hero-card-title"><Search size={20} /> Rechercher sur Konab Marcket</h3>

              <div className="search-field">
                <input
                  placeholder="Que cherchez-vous ?"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <select className="form-control" style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}
                  value={filterVille} onChange={e => setFilterVille(e.target.value)}>
                  {VILLES_SEARCH.map(v => <option key={v}>{v}</option>)}
                </select>
                <select className="form-control" style={{ flex: 1.5, padding: '10px 12px', fontSize: 13 }}
                  value={filterSecteur} onChange={e => setFilterSecteur(e.target.value === 'Tous secteurs' ? '' : e.target.value)}>
                  <option value="">Tous secteurs</option>
                  {SECTEURS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="type-pills">
                {[{ value: '', label: 'Tout', icon: '🔍' }, ...TYPE_ANNONCE].map(t => (
                  <button key={t.value} className={`type-pill ${filterType === t.value ? 'active' : ''}`}
                    onClick={() => setFilterType(t.value)}
                  >
                    {t.icon} {t.label || 'Tout'}
                  </button>
                ))}
              </div>

              <motion.button className="btn btn-primary btn-full"
                style={{ borderRadius: 'var(--radius-sm)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={doSearch}
              >
                <Search size={16} /> Rechercher
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="page">
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              background: 'linear-gradient(135deg, rgba(57,211,83,0.1), rgba(57,211,83,0.03))',
              border: '1px solid rgba(57,211,83,0.2)',
              borderRadius: 'var(--radius)',
              padding: '20px 28px',
              marginBottom: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>
                <Store size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Publiez vos annonces gratuitement
              </div>
              <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 4 }}>
                Rejoignez des milliers de Burkinabè sur Konab Marcket
              </div>
            </div>
            <motion.button className="btn btn-gold"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onShowAuth}
            >
              <Sparkles size={16} /> Créer un compte gratuit →
            </motion.button>
          </motion.div>
        )}

        <div className="section" id="annonces-section">
          <div className="section-header">
            <div className="section-title">
              <div className="section-title-bar" />
              <Package size={22} /> Annonces récentes
              {!loading && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)' }}>({annonces.length})</span>}
            </div>
            {(filterType || filterSecteur || search || filterVille) && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                setFilterType(''); setFilterSecteur(''); setSearch(''); setSearchInput(''); setFilterVille('');
              }}>
                <X size={14} /> Réinitialiser
              </button>
            )}
          </div>

          <div className="filters-bar">
            <span className="filter-group-label">Type :</span>
            {[{ value: '', label: 'Tous', icon: '📋' }, ...TYPE_ANNONCE].map(t => (
              <button key={t.value} className={`chip-filter ${filterType === t.value ? 'active' : ''}`}
                onClick={() => setFilterType(t.value)}>
                {t.icon} {t.label || 'Tous'}
              </button>
            ))}
          </div>
          <div className="filters-bar" style={{ marginTop: 10 }}>
            <span className="filter-group-label">Tri :</span>
            <select className="form-control" style={{ padding: '8px 12px', fontSize: 13, width: 'auto', minWidth: 160 }}
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="created_at">Plus récentes</option>
              <option value="vues">Plus populaires</option>
              <option value="prix_asc">Prix croissant</option>
              <option value="prix_desc">Prix décroissant</option>
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text3)' }}>
              {annonces.length} résultat{annonces.length > 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <SkeletonCards count={6} />
          ) : annonces.length === 0 ? (
            <motion.div className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="icon"><Search size={60} /></div>
              <h3>Aucune annonce trouvée</h3>
              <p>Modifiez vos filtres ou soyez le premier à publier dans cette catégorie !</p>
              {user
                ? <motion.button className="btn btn-primary btn-lg" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowCreate}>
                    <Plus size={18} /> Publier une annonce
                  </motion.button>
                : <motion.button className="btn btn-primary btn-lg" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowAuth}>
                    <Sparkles size={18} /> Créer un compte
                  </motion.button>
              }
            </motion.div>
          ) : (
            <motion.div className="cards-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {annonces.map(a => (
                <motion.div key={a.id} variants={itemVariants}>
                  <AnnonceCard annonce={a} onInterest={handleInterest}
                    onClick={onShowDetail} showFavoriBtn />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <FadeIn>
          <div className="section">
            <div className="section-header">
              <div className="section-title">
                <div className="section-title-bar" />
                <Store size={22} /> Explorez par secteur
              </div>
            </div>
            <div className="secteurs-grid">
              {SECTEURS.map(s => (
                <motion.div key={s} className={`secteur-card ${filterSecteur === s ? 'active' : ''}`}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setFilterSecteur(filterSecteur === s ? '' : s); window.scrollTo(0, 400); }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{SECTEUR_ICONS[s] || '📦'}</div>
                  <div>{s}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="section">
            <div className="section-title" style={{ marginBottom: 28 }}>
              <div className="section-title-bar" />
              <Sparkles size={22} /> Comment ça marche ?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {[
                { icon: <User size={32} />, step: '1', title: 'Créez un compte', desc: 'Inscription gratuite en 30 secondes avec votre email' },
                { icon: <Store size={32} />, step: '2', title: 'Publiez votre annonce', desc: 'Ajoutez des images, décrivez votre offre et votre contact' },
                { icon: <Briefcase size={32} />, step: '3', title: 'Recevez des commandes', desc: 'Les clients vous contactent directement' },
                { icon: <TrendingUp size={32} />, step: '4', title: 'Développez vos ventes', desc: 'Optez pour une formule premium pour plus de visibilité' },
              ].map(item => (
                <motion.div key={item.step} className="card-surface" style={{ textAlign: 'center', margin: 0 }}
                  whileHover={{ y: -4, borderColor: 'rgba(57,211,83,0.3)' }}
                >
                  <div style={{ color: 'var(--vert)', marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
                    {item.icon}
                  </div>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--vert), var(--vert-dark))',
                    color: 'white', fontWeight: 800, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 0 16px rgba(57,211,83,0.2)'
                  }}>
                    {item.step}
                  </div>
                  <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 16, color: 'white' }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>

      <footer className="footer">
        <div className="flag-strip" />
        <div className="footer-inner" style={{ paddingTop: 36 }}>
          <div className="footer-top">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <img src="/logokb.png" alt="Konab Marcket" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain', background: 'white', padding: 2 }} />
                <div className="footer-brand-name">Konab Marcket</div>
              </div>
              <div className="footer-brand-desc">
                La marketplace intelligente du Burkina Faso. Achetez mieux, vendez plus, partout dans le monde. 
                Services, emplois, formations, produits — pour tous les Burkinabè.
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                {['🌍', '💚', '⭐'].map((s, i) => (
                  <span key={i} style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, cursor: 'pointer', transition: 'var(--transition)'
                  }}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="footer-col-title">Plateforme</div>
              {['Accueil', 'Marketplace', 'Catégories', 'Publier une annonce', 'Formules'].map(l => (
                <div key={l} className="footer-link">{l}</div>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Secteurs</div>
              {['Commerce & Distribution', 'Informatique & Tech', 'Emploi & Recrutement', 'Bâtiment & Construction', 'Santé & Bien-être'].map(s => (
                <div key={s} className="footer-link" onClick={() => setFilterSecteur(s)}>{s}</div>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Support</div>
              {['Aide', 'Contact admin', 'Conditions', 'Confidentialité', 'FAQ'].map(l => (
                <div key={l} className="footer-link">{l}</div>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Konab Marcket — Burkina Faso 🇧🇫 — Tous droits réservés</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 6 }}>Achetez mieux · Vendez plus · Partout dans le monde</span>
              <div style={{ width: 14, height: 14, background: 'var(--vert)', borderRadius: 2 }} />
              <div style={{ width: 14, height: 14, background: 'var(--or)', borderRadius: 2 }} />
              <div style={{ width: 14, height: 14, background: 'var(--vert-dark)', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
