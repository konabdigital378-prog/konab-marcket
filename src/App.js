import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, User, LogOut, LayoutDashboard, Shield, ShoppingBag, Heart, MessageCircle, Bike, Menu, ChevronDown, Globe, Package } from 'lucide-react';
import './index.css';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { useToast, ToastContainer } from './components/Toast';
import { NotifProvider, useNotifications } from './hooks/useNotifications';
import NotificationPanel, { NotifBell } from './components/NotificationPanel';
import ErrorBoundary from './components/ErrorBoundary';
import AuthModal from './components/AuthModal';
import AnnonceModal from './components/AnnonceModal';
import SignalementModal from './components/SignalementModal';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AnnonceDetailPage from './pages/AnnonceDetailPage';
import VendeurPage from './pages/VendeurPage';
import MessageriePage from './pages/MessageriePage';
import LivreurPage from './pages/LivreurPage';
import LivraisonDetailPage from './pages/LivraisonDetailPage';
import CategoriesPage from './pages/CategoriesPage';

function AppInner() {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const { toasts, addToast } = useToast();
  const { showPanel, setShowPanel, unreadCount } = useNotifications();
  const [page, setPage] = useState('home');
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);

  const [detailId, setDetailId] = useState(null);
  const [vendeurId, setVendeurId] = useState(null);
  const [initialChat, setInitialChat] = useState(null);
  const [livraisonDetailId, setLivraisonDetailId] = useState(null);
  const [signalementAnnonceId, setSignalementAnnonceId] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => { setScrolled(window.scrollY > 40); };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function nav(p) { setPage(p); setMenuOpen(false); window.scrollTo(0, 0); }
  function showDetail(annonceId) { setDetailId(annonceId); nav('detail'); }
  function showVendeur(id) { setVendeurId(id); nav('vendeur'); }

  function startChat(annonce, vendeur) {
    setInitialChat({ annonceId: annonce?.id, vendeurId: vendeur?.id || annonce?.user_id, annonceTitle: annonce?.titre });
    setPage('messagerie');
  }

  function handleCreateClick() {
    if (!user) { setShowAuth(true); return; }
    setShowCreate(true);
  }

  function handleSignOut() { signOut(); nav('home'); addToast('Déconnexion réussie', 'success'); }
  function handleBackFromDetail() { nav('home'); }
  function showLivraisonDetail(id) { setLivraisonDetailId(id); setPage('livraison_detail'); }
  function showLivraisonFromAnnonce() { setPage('livreur'); }
  function showSignalement(id) { setSignalementAnnonceId(id); }

  const initials = (profile?.nom || user?.email || '?').slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 20, background: 'white' }}>
        <motion.img src="/logokb.png" alt="Konab Marcket"
          style={{ width: 60, height: 60, borderRadius: 16, objectFit: 'contain', padding: 4 }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="spinner" />
        <div style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>Konab Marcket — Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          <motion.div className="header-logo" onClick={() => nav('home')}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <img src="/logokb.png" alt="Konab" />
            <span className="header-logo-text">Konab <span>Marcket</span></span>
          </motion.div>

          <button className="header-cat-btn" onClick={() => setCatMenuOpen(o => !o)}
            style={{ position: 'relative' }}>
            <Menu size={16} /> <span>Catégories</span> <ChevronDown size={14} />
            <AnimatePresence>
              {catMenuOpen && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 300, width: 200, padding: '6px 0' }}
                  onClick={() => setCatMenuOpen(false)}>
                  {['Toutes les catégories', 'Informatique', 'Téléphonie', 'Mode', 'Immobilier', 'Véhicules', 'Alimentation', 'Éducation', 'Services', 'Emploi', 'Santé', 'Sport', 'Agriculture', 'Autre'].map(c => (
                    <button key={c} onClick={() => nav('categories')}
                      style={{ display: 'block', width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' }}>
                      {c}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <div className="header-search">
            <Search size={16} className="header-search-icon" />
            <input placeholder="Rechercher produits, services, catégories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') nav('home'); }} />
          </div>

          <div className="header-actions">
            {user && (
              <button className="header-action" onClick={() => nav('dashboard')} title="Favoris">
                <Heart size={20} />
                <span className="header-action-label">Favoris</span>
              </button>
            )}
            {user && (
              <div style={{ position: 'relative' }}>
                <NotifBell />
                <AnimatePresence>
                  {showPanel && <NotificationPanel onClose={() => setShowPanel(false)} />}
                </AnimatePresence>
              </div>
            )}
            <button className="header-lang" title="Langue">
              <Globe size={16} /> FR
            </button>
            <motion.button className="btn btn-primary btn-sm"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleCreateClick}>
              <Plus size={16} /> <span>Publier</span>
            </motion.button>
            {user ? (
              <div style={{ position: 'relative' }}>
                <button className="header-user" onClick={() => setMenuOpen(o => !o)}>
                  <div className="header-user-avatar">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" />
                      : <span>{initials}</span>
                    }
                  </div>
                  <span className="header-user-name">{profile?.nom || 'Mon compte'}</span>
                  <ChevronDown size={14} style={{ color: 'var(--text3)' }} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onClick={() => setMenuOpen(false)} />
                      <motion.div className="dropdown"
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>{user.email}</div>
                        <button className="dropdown-item" onClick={() => nav('dashboard')}><LayoutDashboard size={16} /> Tableau de bord</button>
                        <button className="dropdown-item" onClick={() => { nav('messagerie'); setMenuOpen(false); }}><MessageCircle size={16} /> Messagerie</button>
                        <button className="dropdown-item" onClick={() => { nav('dashboard'); setMenuOpen(false); }}><Heart size={16} /> Favoris</button>
                        <button className="dropdown-item" onClick={() => { nav('categories'); setMenuOpen(false); }}><Package size={16} /> Catégories</button>
                        <button className="dropdown-item" onClick={() => { nav('livreur'); setMenuOpen(false); }}><Bike size={16} /> Livraison</button>
                        <button className="dropdown-item" onClick={handleCreateClick}><Plus size={16} /> Publier</button>
                        {isAdmin && <><div className="dropdown-divider" /><button className="dropdown-item" onClick={() => nav('admin')}><Shield size={16} /> Administration</button></>}
                        <div className="dropdown-divider" />
                        <button className="dropdown-item" onClick={handleSignOut} style={{ color: 'var(--text3)' }}><LogOut size={16} /> Déconnexion</button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button className="btn btn-secondary btn-sm"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowAuth(true)}>
                <User size={16} /> Connexion
              </motion.button>
            )}
          </div>
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          <motion.div key={page + (detailId || '') + (vendeurId || '')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}>
            {page === 'home'      && <HomePage key={searchQuery} searchQuery={searchQuery}
              onShowAuth={() => setShowAuth(true)} onShowCreate={handleCreateClick}
              onShowDetail={showDetail} onShowVendeur={showVendeur} />}
            {page === 'dashboard' && user && <DashboardPage onShowCreate={() => setShowCreate(true)} />}
            {page === 'admin'     && isAdmin && <AdminPage />}
            {page === 'detail'    && <AnnonceDetailPage annonceId={detailId}
              onBack={handleBackFromDetail} onShowAuth={() => setShowAuth(true)}
              onStartChat={startChat} onShowLivraison={showLivraisonFromAnnonce}
              onShowSignalement={showSignalement} />}
            {page === 'vendeur'   && <VendeurPage vendeurId={vendeurId}
              onBack={handleBackFromDetail} onShowDetail={showDetail} />}
            {page === 'messagerie' && <MessageriePage onBack={() => nav('home')} initialChat={initialChat} onShowDetail={showDetail} onShowVendeur={showVendeur} />}
            {page === 'livreur' && <LivreurPage onBack={() => nav('home')} onShowLivraisonDetail={showLivraisonDetail} />}
            {page === 'livraison_detail' && <LivraisonDetailPage livraisonId={livraisonDetailId} onBack={() => nav('livreur')} />}
            {page === 'categories' && <CategoriesPage onShowDetail={showDetail} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="bottom-nav">
        <div className="bottom-nav-inner">
          <button className={`bottom-nav-item ${page === 'home' ? 'active' : ''}`} onClick={() => nav('home')}>
            <ShoppingBag size={22} /> <span className="bottom-nav-label">Accueil</span>
          </button>
          <button className={`bottom-nav-item ${page === 'categories' ? 'active' : ''}`} onClick={() => nav('categories')}>
            <Search size={22} /> <span className="bottom-nav-label">Catégories</span>
          </button>
          <button className="bottom-nav-item" onClick={handleCreateClick}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--vert)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -20, boxShadow: '0 4px 12px rgba(52,199,89,0.3)' }}>
              <Plus size={24} />
            </div>
            <span className="bottom-nav-label" style={{ marginTop: 2 }}>Publier</span>
          </button>
          {user ? (
            <>
              <button className={`bottom-nav-item ${page === 'messagerie' ? 'active' : ''}`} onClick={() => nav('messagerie')}>
                <MessageCircle size={22} />
                {unreadCount > 0 && <span className="bottom-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                <span className="bottom-nav-label">Messages</span>
              </button>
              <button className={`bottom-nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => nav('dashboard')}>
                <User size={22} /> <span className="bottom-nav-label">Compte</span>
              </button>
            </>
          ) : (
            <>
              <button className="bottom-nav-item" onClick={() => setShowAuth(true)}>
                <User size={22} /> <span className="bottom-nav-label">Connexion</span>
              </button>
              <button className={`bottom-nav-item ${page === 'livreur' ? 'active' : ''}`} onClick={() => nav('livreur')}>
                <Bike size={22} /> <span className="bottom-nav-label">Livraison</span>
              </button>
            </>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <img src="/logokb.png" alt="" style={{ height: 36, width: 'auto', filter: 'brightness(10)' }} />
              <span style={{ fontFamily: 'var(--font-alt)', fontSize: 20, fontWeight: 800, color: 'white' }}>Konab <span style={{ color: '#34C759' }}>Marcket</span></span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>La marketplace premium du Burkina Faso. Achetez et vendez en toute confiance.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {['📱', '💬', '📘', '▶️'].map((s, i) => (
                <span key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="footer-title">Marketplace</h4>
            <button className="footer-link" onClick={() => nav('home')}>Accueil</button>
            <button className="footer-link" onClick={() => nav('categories')}>Catégories</button>
            <button className="footer-link" onClick={() => nav('livreur')}>Livraison</button>
            <button className="footer-link" onClick={handleCreateClick}>Vendre</button>
          </div>
          <div>
            <h4 className="footer-title">Aide</h4>
            <button className="footer-link">Contact</button>
            <button className="footer-link">FAQ</button>
            <button className="footer-link">Conditions</button>
            <button className="footer-link">Confidentialité</button>
          </div>
          <div>
            <h4 className="footer-title">Compte</h4>
            {user ? (
              <>
                <button className="footer-link" onClick={() => nav('dashboard')}>Mon compte</button>
                <button className="footer-link" onClick={() => nav('messagerie')}>Mes messages</button>
                <button className="footer-link" onClick={() => nav('dashboard')}>Mes annonces</button>
                <button className="footer-link" onClick={() => nav('dashboard')}>Favoris</button>
              </>
            ) : (
              <button className="footer-link" onClick={() => setShowAuth(true)}>Connexion</button>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 Konab Marcket — Burkina Faso. Tous droits réservés.
        </div>
      </footer>

      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCreate && user && (
          <AnnonceModal onClose={() => setShowCreate(false)}
            onSaved={() => { setShowCreate(false); addToast('Annonce publiée avec succès !', 'success'); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {signalementAnnonceId && (
          <SignalementModal annonceId={signalementAnnonceId}
            onClose={() => setSignalementAnnonceId(null)}
            onSent={() => { setSignalementAnnonceId(null); addToast('Signalement envoyé ✓', 'success'); }} />
        )}
      </AnimatePresence>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <NotifWrapper />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function NotifWrapper() {
  const { addToast } = useToast();
  return (
    <NotifProvider addToast={addToast}>
      <AppInner />
    </NotifProvider>
  );
}
