import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Sparkles, TrendingUp, Package, Store, Briefcase, X, Plus, User, Crosshair, Zap, Smartphone, Truck, Shield } from 'lucide-react';
import { supabase, SECTEURS, TYPE_ANNONCE, haversine } from '../supabase';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';
import { FadeIn } from '../hooks/useFadeIn';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = [
  { name: 'Informatique', icon: '💻', count: 0 },
  { name: 'Téléphonie', icon: '📱', count: 0 },
  { name: 'Mode', icon: '👗', count: 0 },
  { name: 'Immobilier', icon: '🏠', count: 0 },
  { name: 'Véhicules', icon: '🚗', count: 0 },
  { name: 'Alimentation', icon: '🍲', count: 0 },
  { name: 'Éducation', icon: '📚', count: 0 },
  { name: 'Services', icon: '🔧', count: 0 },
  { name: 'Emploi', icon: '💼', count: 0 },
  { name: 'Santé', icon: '⚕️', count: 0 },
  { name: 'Sport', icon: '🏋️', count: 0 },
  { name: 'Agriculture', icon: '🌾', count: 0 },
];

const VILLES_SEARCH = ['Toutes les villes', 'Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Kaya', 'Tenkodogo', 'Fada N\'Gourma', 'Dédougou'];

export default function HomePage({ onShowAuth, onShowCreate, onShowDetail, onShowVendeur, searchQuery: externalSearch }) {
  const [annonces, setAnnonces] = useState([]);
  const [stats, setStats] = useState({ total: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(externalSearch || '');
  const [filterType, setFilterType] = useState('');
  const [filterSecteur, setFilterSecteur] = useState('');
  const [filterVille, setFilterVille] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [userCoords, setUserCoords] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (externalSearch) { setSearch(externalSearch); }
  }, [externalSearch]);

  async function handleLocate() {
    if (!navigator.geolocation) return;
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      );
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (sortBy !== 'distance') setSortBy('distance');
    } catch (_) {}
  }

  const fetchAnnonces = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('annonces')
        .select('*, profiles(nom, entreprise_nom, certifie, abonnement)')
        .eq('actif', true);

      if (sortBy === 'created_at') q = q.order('created_at', { ascending: false });
      else if (sortBy === 'vues') q = q.order('vues', { ascending: false }).order('created_at', { ascending: false });
      else if (sortBy === 'prix_asc') q = q.order('prix', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
      else if (sortBy === 'prix_desc') q = q.order('prix', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });

      if (filterType) q = q.eq('type', filterType);
      if (filterSecteur) q = q.eq('secteur', filterSecteur);
      if (filterVille && filterVille !== 'Toutes les villes') q = q.ilike('ville', `%${filterVille}%`);
      if (search) q = q.or(`titre.ilike.%${search}%,description.ilike.%${search}%,secteur.ilike.%${search}%`);

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

  async function handleInterest(id) {
    try { await supabase.rpc('increment_vues', { annonce_id: id }); } catch (_) {}
  }

  return (
    <div>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <motion.div className="hero-badge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Sparkles size={14} /> Marketplace 100% Burkinabè
            </motion.div>
            <motion.h1 className="hero-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              Achetez mieux · <span>Vendez plus</span><br />
              <span style={{ color: 'var(--orange)' }}>Partout dans le monde</span>
            </motion.h1>
            <motion.p className="hero-desc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              La marketplace intelligente qui connecte acheteurs et vendeurs du Burkina Faso au monde entier. 
              Services, produits, emplois, formations — tout en un clic.
            </motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
              {user ? (
                <motion.button className="btn btn-primary btn-lg"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowCreate}>
                  <Store size={20} /> Publier une annonce
                </motion.button>
              ) : (
                <>
                  <motion.button className="btn btn-primary btn-lg"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowAuth}>
                    <Sparkles size={20} /> Commencer à vendre
                  </motion.button>
                  <motion.button className="btn btn-secondary btn-lg"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => document.getElementById('annonces-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Découvrir les produits <ArrowRight size={18} />
                  </motion.button>
                </>
              )}
            </motion.div>
            <motion.div className="hero-stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
              <div className="hero-stat">
                <h3>{stats.total}+</h3>
                <p>Annonces actives</p>
              </div>
              <div className="hero-stat">
                <h3>{stats.users}+</h3>
                <p>Vendeurs</p>
              </div>
              <div className="hero-stat">
                <h3>20</h3>
                <p>Secteurs</p>
              </div>
              <div className="hero-stat">
                <h3>🌍</h3>
                <p>Livraison monde</p>
              </div>
            </motion.div>
          </div>

          <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.3 }}>
            <div className="hero-mockup" style={{ background: 'linear-gradient(180deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'white', padding: 20 }}>
                <Smartphone size={48} style={{ opacity: 0.5, marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: 18 }}>Konab Marcket</div>
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>Marketplace BF</div>
              </div>
            </div>
            <div className="hero-float-card" style={{ top: '10%', right: '-5%' }}>
              <div className="hero-float-icon" style={{ background: 'var(--vert-bg)', color: 'var(--vert)' }}><Truck size={22} /></div>
              <div><div className="hero-float-text">Livraison partout</div><div className="hero-float-sub">Burkina Faso → Monde</div></div>
            </div>
            <div className="hero-float-card" style={{ bottom: '15%', left: '-8%' }}>
              <div className="hero-float-icon" style={{ background: 'var(--orange-bg)', color: 'var(--orange)' }}><Shield size={22} /></div>
              <div><div className="hero-float-text">Paiement sécurisé</div><div className="hero-float-sub">100% fiable</div></div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="container">
          <FadeIn>
            <section className="section" style={{ paddingTop: 20, paddingBottom: 40 }}>
              <div className="section-title">🛍️ Catégories</div>
              <div className="section-sub">Explorez par catégorie pour trouver ce que vous cherchez</div>
              <div className="categories-grid">
                {CATEGORIES.map((cat, i) => (
                  <motion.div key={cat.name} className="category-card"
                    whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setFilterSecteur(cat.name); window.scrollTo({ top: 500, behavior: 'smooth' }); }}>
                    <div className="category-card-icon">{cat.icon}</div>
                    <div className="category-card-name">{cat.name}</div>
                    <div className="category-card-count">{cat.count || 'Nouveau'}</div>
                  </motion.div>
                ))}
              </div>
            </section>
          </FadeIn>

          {!user && (
            <FadeIn>
              <div style={{
                background: 'linear-gradient(135deg, var(--vert-bg), transparent)',
                border: '1px solid rgba(52,199,89,0.2)', borderRadius: 'var(--radius)',
                padding: '24px 28px', marginBottom: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    <Store size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                    Publiez vos annonces gratuitement
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text3)' }}>Rejoignez des milliers de Burkinabè</div>
                </div>
                <motion.button className="btn btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowAuth}>
                  <Sparkles size={16} /> Créer un compte gratuit
                </motion.button>
              </div>
            </FadeIn>
          )}

          <section className="section" id="annonces-section" style={{ paddingTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="section-title" style={{ marginBottom: 0 }}>
                  <Package size={22} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                  Annonces
                  {!loading && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)', marginLeft: 8 }}>({sortedAnnonces.length})</span>}
                </div>
                <div className="section-sub" style={{ marginBottom: 0, fontSize: 14 }}>Découvrez les meilleures offres près de chez vous</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="form-control" style={{ padding: '8px 12px', fontSize: 13, width: 'auto', minWidth: 120, borderRadius: 8 }}
                  value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="created_at">Plus récentes</option>
                  <option value="vues">Plus populaires</option>
                  <option value="prix_asc">Prix croissant</option>
                  <option value="prix_desc">Prix décroissant</option>
                  <option value="distance">À proximité</option>
                </select>
                {!userCoords && sortBy === 'distance' && (
                  <motion.button className="btn btn-outline btn-sm"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleLocate} style={{ borderRadius: 8 }}>
                    <Crosshair size={14} /> Localiser
                  </motion.button>
                )}
                {(filterType || filterSecteur || search) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setFilterType(''); setFilterSecteur(''); setSearch('');
                  }}>
                    <X size={14} /> Effacer
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <select className="form-control" style={{ padding: '8px 12px', fontSize: 13, width: 'auto', minWidth: 130, borderRadius: 8, background: 'white' }}
                value={filterVille} onChange={e => setFilterVille(e.target.value)}>
                {VILLES_SEARCH.map(v => <option key={v}>{v}</option>)}
              </select>
              <select className="form-control" style={{ padding: '8px 12px', fontSize: 13, width: 'auto', minWidth: 150, borderRadius: 8, background: 'white' }}
                value={filterSecteur} onChange={e => setFilterSecteur(e.target.value)}>
                <option value="">Tous secteurs</option>
                {SECTEURS.map(s => <option key={s}>{s}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[{ value: '', label: 'Tout', icon: '🔍' }, ...TYPE_ANNONCE].map(t => (
                  <button key={t.value} className={`badge ${filterType === t.value ? 'badge-success' : ''}`}
                    style={{ cursor: 'pointer', border: 'none', fontFamily: 'var(--font)', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}
                    onClick={() => setFilterType(t.value)}>
                    {t.icon} {t.label || 'Tout'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <SkeletonCards count={6} />
            ) : sortedAnnonces.length === 0 ? (
              <motion.div className="text-center" style={{ padding: '60px 20px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Search size={48} style={{ color: 'var(--text3)', marginBottom: 16 }} />
                <h3 style={{ color: 'var(--text)', marginBottom: 8 }}>Aucune annonce trouvée</h3>
                <p style={{ color: 'var(--text3)', marginBottom: 20 }}>Modifiez vos filtres ou publiez la première annonce !</p>
                {user
                  ? <button className="btn btn-primary" onClick={onShowCreate}><Plus size={18} /> Publier</button>
                  : <button className="btn btn-primary" onClick={onShowAuth}><Sparkles size={18} /> Créer un compte</button>
                }
              </motion.div>
            ) : (
              <>
                {bestOffers.length >= 3 && (
                  <FadeIn>
                    <div style={{ marginBottom: 28, padding: '20px 24px', background: 'linear-gradient(135deg, var(--orange-bg), transparent)', borderRadius: 'var(--radius)', border: '1px solid rgba(245,166,35,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <Zap size={20} style={{ color: 'var(--orange)' }} />
                        <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>Meilleures offres — petits prix</span>
                        <span className="badge badge-warning">🔥 Jusqu'à 25 000 FCFA</span>
                      </div>
                      <div className="products-grid">
                        {bestOffers.map(a => (
                          <AnnonceCard key={a.id} annonce={a} onInterest={handleInterest} onClick={onShowDetail} showFavoriBtn userCoords={userCoords} />
                        ))}
                      </div>
                    </div>
                  </FadeIn>
                )}

                <div className="products-grid">
                  {sortedAnnonces.map(a => (
                    <AnnonceCard key={a.id} annonce={a} onInterest={handleInterest} onClick={onShowDetail} showFavoriBtn userCoords={userCoords} />
                  ))}
                </div>
              </>
            )}
          </section>

          <FadeIn>
            <section className="section">
              <div className="section-title">📋 Comment ça marche ?</div>
              <div className="section-sub">4 étapes simples pour vendre sur Konab Marcket</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                {[
                  { icon: <User size={28} />, step: '1', title: 'Créez un compte', desc: 'Inscription gratuite en 30 secondes' },
                  { icon: <Store size={28} />, step: '2', title: 'Publiez votre annonce', desc: 'Ajoutez photos, prix et contact' },
                  { icon: <Briefcase size={28} />, step: '3', title: 'Recevez des commandes', desc: 'Les clients vous contactent sur WhatsApp' },
                  { icon: <TrendingUp size={28} />, step: '4', title: 'Développez vos ventes', desc: 'Optez pour le premium et gagnez en visibilité' },
                ].map(item => (
                  <motion.div key={item.step}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, textAlign: 'center' }}
                    whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ color: 'var(--vert)', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--vert)', color: 'white', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{item.step}</div>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 16, color: 'var(--text)' }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>{item.desc}</div>
                  </motion.div>
                ))}
              </div>
            </section>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
