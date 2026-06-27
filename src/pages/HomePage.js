import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Sparkles, TrendingUp, Package, Store, Briefcase, X, Plus, User, Crosshair, Zap, Volume2 } from 'lucide-react';
import { supabase, SECTEURS, TYPE_ANNONCE, haversine } from '../supabase';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';
import { FadeIn } from '../hooks/useFadeIn';
import { useAuth } from '../hooks/useAuth';
import { speak } from '../hooks/useVoiceSearch';

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
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
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
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [heroPlaying, setHeroPlaying] = useState(false);
  const searchRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!searchInput || searchInput.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('annonces')
        .select('titre').ilike('titre', `%${searchInput}%`).eq('actif', true).limit(5);
      if (data) setSuggestions(data.map(d => d.titre));
      setShowSuggestions(data && data.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      );
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (sortBy !== 'distance') setSortBy('distance');
    } catch (_) {}
    setLocating(false);
  }

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

  const sortedAnnonces = useMemo(() => {
    if (sortBy !== 'distance' || !userCoords) return annonces;
    return [...annonces].sort((a, b) => {
      const distA = a.latitude && a.longitude ? haversine(userCoords.lat, userCoords.lng, a.latitude, a.longitude) : Infinity;
      const distB = b.latitude && b.longitude ? haversine(userCoords.lat, userCoords.lng, b.latitude, b.longitude) : Infinity;
      return distA - distB;
    });
  }, [annonces, sortBy, userCoords]);

  const bestOffers = useMemo(() => {
    return [...sortedAnnonces]
      .filter(a => a.prix && a.prix > 0 && a.prix <= 25000)
      .sort((a, b) => (a.prix || 0) - (b.prix || 0))
      .slice(0, 6);
  }, [sortedAnnonces]);

  function doSearch() { setSearch(searchInput); setShowSuggestions(false); }
  function selectSuggestion(s) { setSearchInput(s); setSearch(s); setShowSuggestions(false); }

  async function handleInterest(id) {
    try { await supabase.rpc('increment_vues', { annonce_id: id }); } catch (_) {}
  }

  return (
    <div>
      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/hero-bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
          <div className="hero-bg-gradient" />
          <div className="hero-grid" />
          <div className="hero-globe" />
        </div>

        <div className="hero-content">
          <div className="hero-text">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="hero-kicker"><Sparkles size={14} /> Marketplace 100% Burkinabè</div>
            </motion.div>
            <motion.h1 className="hero-title"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              Achetez mieux · <span className="gradient-vert">Vendez plus</span><br />
              <span className="gradient-or">Partout dans le monde</span>
            </motion.h1>
            <motion.p className="hero-sub"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              La marketplace intelligente qui connecte acheteurs et vendeurs du Burkina Faso au monde entier. 
              Services, produits, emplois, formations — tout en un clic.
            </motion.p>
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (heroPlaying) { window.speechSynthesis?.cancel(); setHeroPlaying(false); return; }
                setHeroPlaying(true);
                const utt = new SpeechSynthesisUtterance('Konab Marcket. La marketplace intelligente du Burkina Faso. Achetez mieux, vendez plus, partout dans le monde. Services, produits, emplois, formations, tout en un clic.');
                utt.lang = 'fr-FR'; utt.rate = 0.85;
                utt.onend = () => setHeroPlaying(false); utt.onerror = () => setHeroPlaying(false);
                const voices = window.speechSynthesis?.getVoices() || [];
                const fr = voices.find(v => v.lang.startsWith('fr'));
                if (fr) utt.voice = fr;
                window.speechSynthesis?.speak(utt);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.2)', background: heroPlaying ? 'var(--vert)' : 'rgba(255,255,255,0.08)',
                color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 16,
              }}>
              <Volume2 size={14} /> {heroPlaying ? 'Écoute en cours...' : '🔊 Écouter la description'}
            </motion.button>
            <motion.div className="hero-actions"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
              {user ? (
                <motion.button className="btn btn-primary btn-xl"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowCreate}>
                  <Store size={20} /> Publier une annonce
                </motion.button>
              ) : (
                <>
                  <motion.button className="btn btn-primary btn-xl"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowAuth}>
                    <Sparkles size={20} /> Commencer à vendre
                  </motion.button>
                  <motion.button className="btn btn-outline btn-xl"
                    whileHover={{ scale: 1.03, borderColor: 'var(--vert)' }} whileTap={{ scale: 0.97 }}
                    onClick={() => document.getElementById('annonces-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Découvrir les produits <ArrowRight size={18} />
                  </motion.button>
                </>
              )}
            </motion.div>
            <motion.div className="hero-stats"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
              <div><div className="hero-stat-value">{stats.total}+</div><div className="hero-stat-label">Annonces actives</div></div>
              <div><div className="hero-stat-value">{stats.users}+</div><div className="hero-stat-label">Vendeurs</div></div>
              <div><div className="hero-stat-value">20</div><div className="hero-stat-label">Secteurs</div></div>
              <div><div className="hero-stat-value">Globe</div><div className="hero-stat-label">Livraison monde</div></div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
            <div className="hero-card">
              <h3 className="hero-card-title"><Search size={20} /> Rechercher sur Konab Marcket</h3>
              <div className="search-field" ref={searchRef} style={{ position: 'relative' }}>
                <input placeholder="Que cherchez-vous ?" value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} />
                {showSuggestions && (
                  <div className="search-autocomplete">
                    {suggestions.map((s, i) => (
                      <div key={i} className="search-autocomplete-item" onClick={() => selectSuggestion(s)}>
                        <Search size={14} style={{ color: 'var(--text3)' }} />
                        <span dangerouslySetInnerHTML={{ __html: s.replace(new RegExp(`(${searchInput})`, 'gi'), '<span class="highlight">$1</span>') }} />
                      </div>
                    ))}
                  </div>
                )}
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
                    onClick={() => setFilterType(t.value)}>
                    {t.icon} {t.label || 'Tout'}
                  </button>
                ))}
              </div>
              <motion.button className="btn btn-primary btn-full"
                style={{ borderRadius: 'var(--radius-sm)' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={doSearch}>
                <Search size={16} /> Rechercher
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="page">
        <div className="quick-nav" style={{ padding: '0 20px', maxWidth: 800, margin: '-10px auto 20px' }}>
          {[
            { icon: '🛒', label: 'Acheter', action: () => setFilterType('offre') },
            { icon: '📦', label: 'Articles', action: () => setFilterType('article') },
            { icon: '💼', label: 'Emploi', action: () => setFilterType('emploi') },
            { icon: '📚', label: 'Formations', action: () => setFilterType('formation') },
            { icon: '🔧', label: 'Services', action: () => setFilterType('service') },
            { icon: '📍', label: 'Près de moi', action: () => { setSortBy('distance'); handleLocate(); } },
          ].map((q, i) => (
            <motion.button key={i} className="quick-nav-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={q.action}>
              <span>{q.icon}</span>
              <span>{q.label}</span>
            </motion.button>
          ))}
        </div>

        {!user && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{
              background: 'linear-gradient(135deg, rgba(57,211,83,0.1), rgba(57,211,83,0.03))',
              border: '1px solid rgba(57,211,83,0.2)', borderRadius: 'var(--radius)',
              padding: '20px 28px', marginBottom: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
            }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>
                <Store size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                Publiez vos annonces gratuitement
              </div>
              <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 4 }}>
                Rejoignez des milliers de Burkinabè sur Konab Marcket
              </div>
            </div>
            <motion.button className="btn btn-gold" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowAuth}>
              <Sparkles size={16} /> Créer un compte gratuit →
            </motion.button>
          </motion.div>
        )}

        <div className="section" id="annonces-section">
          <div className="section-header">
            <div className="section-title">
              <div className="section-title-bar" />
              <Package size={22} /> Annonces
              {!loading && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)' }}>({sortedAnnonces.length})</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(filterType || filterSecteur || search || filterVille) && (
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  setFilterType(''); setFilterSecteur(''); setSearch(''); setSearchInput(''); setFilterVille('');
                }}>
                  <X size={14} /> Réinitialiser
                </button>
              )}
            </div>
          </div>

          <div className="filters-bar">
            <span className="filter-group-label">Type :</span>
            {[{ value: '', label: 'Tous', icon: '📋' }, ...TYPE_ANNONCE].map(t => (
              <button key={t.value} className={`chip-filter ${filterType === t.value ? 'active' : ''}`}
                onClick={() => setFilterType(t.value)}>
                {t.icon} {t.label || 'Tous'}
              </button>
            ))}
            <div className="filter-divider" />
            <span className="filter-group-label">Tri :</span>
            <select className="form-control" style={{ padding: '6px 10px', fontSize: 12, width: 'auto', minWidth: 130 }}
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="created_at">Plus récentes</option>
              <option value="vues">Plus populaires</option>
              <option value="prix_asc">Prix croissant</option>
              <option value="prix_desc">Prix décroissant</option>
              <option value="distance">À proximité</option>
            </select>
            {sortBy === 'distance' && !userCoords && (
              <motion.button className="btn btn-outline btn-sm"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleLocate} disabled={locating}
                style={{ fontSize: 12 }}>
                <Crosshair size={14} /> {locating ? 'Localisation...' : 'Ma position'}
              </motion.button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text3)' }}>
              {sortedAnnonces.length} résultat{sortedAnnonces.length > 1 ? 's' : ''}
              {userCoords && sortBy === 'distance' && (
                <span style={{ marginLeft: 8 }}>📍 {userCoords.lat.toFixed(2)}, {userCoords.lng.toFixed(2)}</span>
              )}
            </span>
          </div>

          {loading ? (
            <SkeletonCards count={6} />
          ) : sortedAnnonces.length === 0 ? (
            <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="icon"><Search size={60} /></div>
              <h3>Aucune annonce trouvée</h3>
              <p>Modifiez vos filtres ou soyez le premier à publier dans cette catégorie !</p>
              {user
                ? <motion.button className="btn btn-primary btn-lg" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowCreate}><Plus size={18} /> Publier une annonce</motion.button>
                : <motion.button className="btn btn-primary btn-lg" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowAuth}><Sparkles size={18} /> Créer un compte</motion.button>
              }
            </motion.div>
          ) : (
            <>
              {bestOffers.length >= 3 && (
                <FadeIn>
                  <div className="card-surface" style={{ marginBottom: 24, padding: '18px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <Zap size={20} style={{ color: 'var(--or)' }} />
                      <span style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>Meilleures offres — petits prix</span>
                      <span className="badge badge-warning">🔥 Jusqu'à 25 000 FCFA</span>
                    </div>
                    <div className="cards-grid" style={{ gap: 14 }}>
                      {bestOffers.map(a => (
                        <motion.div key={a.id} variants={itemVariants}>
                          <AnnonceCard annonce={a} onInterest={handleInterest} onClick={onShowDetail} showFavoriBtn userCoords={userCoords} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              )}

              <motion.div className="cards-grid" variants={containerVariants} initial="hidden" animate="visible">
                {sortedAnnonces.map(a => (
                  <motion.div key={a.id} variants={itemVariants}>
                    <AnnonceCard annonce={a} onInterest={handleInterest} onClick={onShowDetail} showFavoriBtn userCoords={userCoords} />
                  </motion.div>
                ))}
              </motion.div>
            </>
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
                  whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setFilterSecteur(filterSecteur === s ? '' : s); window.scrollTo(0, 400); }}>
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
              <div className="section-title-bar" /> <Sparkles size={22} /> Comment ça marche ?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {[
                { icon: <User size={32} />, step: '1', title: 'Créez un compte', desc: 'Inscription gratuite en 30 secondes avec votre email' },
                { icon: <Store size={32} />, step: '2', title: 'Publiez votre annonce', desc: 'Ajoutez des images, votre position et votre contact' },
                { icon: <Briefcase size={32} />, step: '3', title: 'Recevez des commandes', desc: 'Les clients vous contactent directement' },
                { icon: <TrendingUp size={32} />, step: '4', title: 'Développez vos ventes', desc: 'Optez pour une formule premium pour plus de visibilité' },
              ].map(item => (
                <motion.div key={item.step} className="card-surface" style={{ textAlign: 'center', margin: 0 }}
                  whileHover={{ y: -4, borderColor: 'rgba(57,211,83,0.3)' }}>
                  <div style={{ color: 'var(--vert)', marginBottom: 14, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--vert), var(--vert-dark))', color: 'white', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 0 16px rgba(57,211,83,0.2)' }}>{item.step}</div>
                  <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 16, color: 'white' }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>

      {showHelp && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && setShowHelp(false)}>
          <motion.div className="modal" style={{ maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}
            initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}>
            <div className="flag-strip" />
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>❓</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Guide d'utilisation</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)' }}>Comment utiliser Konab Marcket</p>
                </div>
              </div>
              <motion.button className="modal-close" onClick={() => setShowHelp(false)}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <X size={18} />
              </motion.button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {/* ÉTAPE 1 : Acheter */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px', background: 'rgba(57,211,83,0.06)', borderRadius: 14, border: '1px solid rgba(57,211,83,0.15)', marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--vert)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, color: 'white', fontWeight: 800 }}>1</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🛒 Acheter un produit</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    1. Cherchez un produit 🔍<br />
                    2. Appuyez sur la photo 📷<br />
                    3. Appuyez sur <strong>"Intéressé(e)"</strong> 💬<br />
                    4. Le vendeur vous répond sur WhatsApp 📱
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => speak('Pour acheter: cherchez un produit, appuyez sur la photo, puis appuyez sur intéressé. Le vendeur vous répond sur WhatsApp.')}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--vert)', background: 'rgba(57,211,83,0.1)', color: 'var(--vert)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  🔊
                </motion.button>
              </motion.div>

              {/* ÉTAPE 2 : Vendre */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px', background: 'var(--orange-bg)', borderRadius: 14, border: '1px solid rgba(245,166,35,0.15)', marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, color: 'white', fontWeight: 800 }}>2</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>📦 Vendre un produit</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    1. Créez un compte gratuit 👤<br />
                    2. Appuyez sur <strong>"Publier"</strong> ➕<br />
                    3. Ajoutez une photo 📷<br />
                    4. Donnez un titre et un prix 💰<br />
                    5. Appuyez sur <strong>"Publier"</strong> ✅
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => speak('Pour vendre: créez un compte, appuyez sur publier, ajoutez une photo, donnez un titre et un prix, puis publiez.')}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--orange)', background: 'rgba(245,166,35,0.1)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  🔊
                </motion.button>
              </motion.div>

              {/* ÉTAPE 3 : Chercher avec la voix */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px', background: 'rgba(99,102,241,0.06)', borderRadius: 14, border: '1px solid rgba(99,102,241,0.15)', marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, color: 'white', fontWeight: 800 }}>3</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🎤 Chercher avec la voix</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    1. Appuyez sur le <strong>microphone</strong> 🎙️<br />
                    2. Dites ce que vous cherchez<br />
                    3. Les résultats apparaissent automatiquement ✨
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => speak('Pour chercher avec la voix: appuyez sur le microphone, dites ce que vous cherchez, les résultats apparaissent automatiquement.')}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  🔊
                </motion.button>
              </motion.div>

              {/* ÉTAPE 4 : Écouter */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px', background: 'rgba(139,92,246,0.06)', borderRadius: 14, border: '1px solid rgba(139,92,246,0.15)', marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, color: 'white', fontWeight: 800 }}>4</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🔊 Écouter une annonce</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    Appuyez sur le bouton <strong>🔊</strong> sur n'importe quelle annonce pour écouter le titre, le prix et la description.
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => speak('Pour écouter une annonce: appuyez sur le bouton audio pour écouter le titre, le prix et la description.')}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #8B5CF6', background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  🔊
                </motion.button>
              </motion.div>

              {/* ÉTAPE 5 : Localiser */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px', background: 'rgba(245,183,0,0.06)', borderRadius: 14, border: '1px solid rgba(245,183,0,0.15)', marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--or)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, color: 'white', fontWeight: 800 }}>5</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>📍 Trouver près de chez moi</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    1. Appuyez sur <strong>"Ma position"</strong> 📡<br />
                    2. Autorisez la localisation<br />
                    3. Les produits près de vous apparaissent en premier 🏠
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => speak('Pour trouver près de chez vous: appuyez sur ma position, autorisez la localisation, les produits près de vous apparaissent en premier.')}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--or)', background: 'rgba(245,183,0,0.1)', color: 'var(--or)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  🔊
                </motion.button>
              </motion.div>

              {/* TIPS */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 14, border: '1px solid rgba(239,68,68,0.15)', padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>💡 Astuce</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                  Appuyez sur le bouton 🔊 à côté de chaque étape pour écouter les instructions. Le guide vous lit automatiquement !
                </div>
              </motion.div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { setShowHelp(false); speak('Guide fermé. Bonne navigation sur Konab Marcket.'); }}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--vert), var(--vert-dark))', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(57,211,83,0.3)' }}>
                ✅ J'ai compris !
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.button className="help-fab" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => { setShowHelp(h => !h); if (!showHelp) speak('Besoin d\'aide ? Apprenez comment utiliser Konab Marcket.'); }}>
        {showHelp ? '✕' : '❓'}
      </motion.button>

      <footer className="footer">
        <div className="flag-strip" />
        <div className="footer-inner" style={{ paddingTop: 36 }}>
          <div className="footer-top">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <img src="/logokb.png" alt="Konab Marcket" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain', background: 'white', padding: 2 }} />
                <div className="footer-brand-name">Konab Marcket</div>
              </div>
              <div className="footer-brand-desc">La marketplace intelligente du Burkina Faso. Achetez mieux, vendez plus, partout dans le monde.</div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                {['🌍', '💚', '⭐'].map((s, i) => (
                  <span key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', transition: 'var(--transition)' }}>{s}</span>
                ))}
              </div>
            </div>
            <div><div className="footer-col-title">Plateforme</div>{['Accueil', 'Marketplace', 'Catégories', 'Publier une annonce', 'Formules'].map(l => (<div key={l} className="footer-link">{l}</div>))}</div>
            <div><div className="footer-col-title">Secteurs</div>{['Commerce & Distribution', 'Informatique & Tech', 'Emploi & Recrutement', 'Bâtiment & Construction', 'Santé & Bien-être'].map(s => (<div key={s} className="footer-link" onClick={() => setFilterSecteur(s)}>{s}</div>))}</div>
            <div><div className="footer-col-title">Support</div>{['Aide', 'Contact admin', 'Conditions', 'Confidentialité', 'FAQ'].map(l => (<div key={l} className="footer-link">{l}</div>))}</div>
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