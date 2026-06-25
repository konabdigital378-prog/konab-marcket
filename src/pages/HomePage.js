import { useState, useEffect, useCallback } from 'react';
import { supabase, SECTEURS, TYPE_ANNONCE } from '../supabase';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';
import { FadeIn, FadeInFast } from '../hooks/useFadeIn';
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

export default function HomePage({ onShowAuth, onShowCreate, searchQuery: externalSearch }) {
  const [annonces, setAnnonces] = useState([]);
  const [stats, setStats] = useState({ total: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(externalSearch || '');
  const [searchInput, setSearchInput] = useState(externalSearch || '');
  const [filterType, setFilterType] = useState('');
  const [filterSecteur, setFilterSecteur] = useState('');
  const [filterVille, setFilterVille] = useState('');
  const { user } = useAuth();

  const fetchAnnonces = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('annonces')
        .select('*, profiles(nom, entreprise_nom, certifie, abonnement)')
        .eq('actif', true)
        .order('created_at', { ascending: false });

      if (filterType)    q = q.eq('type', filterType);
      if (filterSecteur) q = q.eq('secteur', filterSecteur);
      if (filterVille && filterVille !== 'Toutes les villes') q = q.ilike('ville', `%${filterVille}%`);
      if (search)        q = q.or(`titre.ilike.%${search}%,description.ilike.%${search}%,secteur.ilike.%${search}%`);

      const { data, error } = await q.limit(80);
      if (!error) setAnnonces(data || []);
    } catch (_) {}
    setLoading(false);
  }, [filterType, filterSecteur, filterVille, search]);

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
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-bg-pattern" />
        <div className="hero-stripe-rouge" />
        <div className="hero-stripe-vert" />
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-kicker">🇧🇫 Marketplace 100% Burkinabè</div>
            <h2 className="hero-title">
              Trouvez & proposez des <span className="accent-rouge">opportunités</span> au <span className="accent-or">Burkina Faso</span>
            </h2>
            <p className="hero-sub">
              Services, emplois, formations, articles à vendre — tout en un seul endroit, pour tous les Burkinabè.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {user
                ? <button className="btn btn-rouge btn-lg" onClick={onShowCreate}>➕ Publier une annonce</button>
                : <>
                    <button className="btn btn-rouge btn-lg" onClick={onShowAuth}>✨ Rejoindre gratuitement</button>
                    <button className="btn btn-outline-blanc btn-lg" onClick={() => document.getElementById('annonces-section')?.scrollIntoView({ behavior: 'smooth' })}>
                      Voir les annonces ↓
                    </button>
                  </>
              }
            </div>
            <div className="hero-stats-row">
              <div className="hero-stat"><div className="hero-stat-num">{stats.total}+</div><div className="hero-stat-label">Annonces actives</div></div>
              <div className="hero-stat"><div className="hero-stat-num">{stats.users}+</div><div className="hero-stat-label">Prestataires</div></div>
              <div className="hero-stat"><div className="hero-stat-num">20</div><div className="hero-stat-label">Secteurs couverts</div></div>
              <div className="hero-stat"><div className="hero-stat-num">13</div><div className="hero-stat-label">Régions</div></div>
            </div>
          </div>

          {/* Carte de recherche */}
          <div className="hero-search-card">
            <h3>🔍 Rechercher une annonce</h3>
            <div className="search-field">
              <input
                placeholder="Que cherchez-vous ? (service, produit...)"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
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
            <button className="btn btn-rouge btn-full" style={{ borderRadius: 'var(--radius-sm)' }} onClick={doSearch}>
              🔍 Rechercher
            </button>
          </div>
        </div>
      </section>

      <div className="page">
        {/* CTA bande */}
        {!user && (
          <div style={{ background: 'linear-gradient(135deg, var(--vert-dark), var(--vert))', borderRadius: 'var(--radius)', padding: '18px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>🚀 Publiez vos annonces gratuitement</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>Rejoignez des milliers de Burkinabè sur Konab Marcket</div>
            </div>
            <button className="btn btn-or" onClick={onShowAuth}>✨ Créer un compte gratuit →</button>
          </div>
        )}

        {/* Annonces */}
        <div className="section" id="annonces-section">
          <div className="section-header">
            <div className="section-title">
              <div className="section-title-bar" />
              📋 Annonces récentes
              {!loading && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)' }}>({annonces.length})</span>}
            </div>
            {(filterType || filterSecteur || search || filterVille) && (
              <button className="btn btn-outline btn-sm" onClick={() => {
                setFilterType(''); setFilterSecteur(''); setSearch(''); setSearchInput(''); setFilterVille('');
              }}>✕ Réinitialiser</button>
            )}
          </div>

          {/* Filtres rapides type */}
          <div className="filters-bar">
            <span className="filter-group-label">Type :</span>
            {[{ value: '', label: 'Tous', icon: '📋' }, ...TYPE_ANNONCE].map(t => (
              <button key={t.value} className={`chip-filter ${filterType === t.value ? 'active' : ''}`}
                onClick={() => setFilterType(t.value)}>
                {t.icon} {t.label || 'Tous'}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonCards count={6} />
          ) : annonces.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔍</div>
              <h3>Aucune annonce trouvée</h3>
              <p>Modifiez vos filtres ou soyez le premier à publier dans cette catégorie !</p>
              {user
                ? <button className="btn btn-rouge btn-lg" onClick={onShowCreate}>➕ Publier une annonce</button>
                : <button className="btn btn-vert btn-lg" onClick={onShowAuth}>Créer un compte</button>
              }
            </div>
          ) : (
            <div className="cards-grid">
              {annonces.map((a, i) => (
                <FadeInFast key={a.id}>
                  <AnnonceCard annonce={a} onInterest={handleInterest} />
                </FadeInFast>
              ))}
            </div>
          )}
        </div>

        {/* Secteurs */}
        <FadeIn>
          <div className="section">
            <div className="section-header">
              <div className="section-title">
                <div className="section-title-bar" />
                🏢 Explorez par secteur
              </div>
            </div>
            <div className="secteurs-grid">
              {SECTEURS.map(s => (
              <div key={s} className={`secteur-card ${filterSecteur === s ? 'active' : ''}`}
                onClick={() => { setFilterSecteur(filterSecteur === s ? '' : s); window.scrollTo(0, 400); }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{SECTEUR_ICONS[s] || '📦'}</div>
                <div>{s}</div>
              </div>
            ))}
          </div>
        </div>
        </FadeIn>

        {/* Comment ça marche */}
        <FadeIn>
        <div className="section">
          <div className="section-title" style={{ marginBottom: 24 }}>
            <div className="section-title-bar" />
            💡 Comment ça marche ?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            {[
              { icon: '📝', step: '1', title: 'Créez un compte', desc: 'Inscription gratuite en 30 secondes avec votre email' },
              { icon: '📸', step: '2', title: 'Publiez votre annonce', desc: 'Ajoutez une affiche, décrivez votre offre et votre WhatsApp' },
              { icon: '💬', step: '3', title: 'Recevez des contacts', desc: 'Les clients vous contactent directement sur WhatsApp' },
              { icon: '⭐', step: '4', title: 'Développez vos affaires', desc: 'Optez pour une formule premium pour plus de visibilité' },
            ].map(item => (
              <div key={item.step} className="card-surface" style={{ textAlign: 'center', margin: 0 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--vert)', color: 'white', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>{item.step}</div>
                <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 15 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
        </FadeIn>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="flag-strip" />
        <div className="footer-inner" style={{ paddingTop: 32 }}>
          <div className="footer-top">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,var(--rouge) 33%,var(--vert) 33% 66%,var(--or) 66%)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛍</div>
                <div className="footer-brand-name">Konab Marcket</div>
              </div>
              <div className="footer-brand-desc">La marketplace de référence du Burkina Faso. Services, emplois, formations, articles — pour tous les Burkinabè.</div>
            </div>
            <div>
              <div className="footer-col-title">Liens rapides</div>
              {['Accueil', 'Publier une annonce', 'Formules', 'Contact admin'].map(l => (
                <div key={l} className="footer-link">{l}</div>
              ))}
            </div>
            <div>
              <div className="footer-col-title">Secteurs populaires</div>
              {['Commerce & Distribution', 'Informatique & Tech', 'Emploi & Recrutement', 'Bâtiment & Construction', 'Santé & Bien-être'].map(s => (
                <div key={s} className="footer-link" onClick={() => setFilterSecteur(s)}>{s}</div>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2025 Konab Marcket — Bobo-Dioulasso, Burkina Faso 🇧🇫</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 14, height: 14, background: 'var(--rouge)', borderRadius: 2 }} />
              <div style={{ width: 14, height: 14, background: 'var(--vert)', borderRadius: 2 }} />
              <div style={{ width: 14, height: 14, background: 'var(--or)', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
