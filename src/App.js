import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, User, LogOut, LayoutDashboard, Shield, ShoppingBag, Heart, MessageCircle, Bike, Sun, Moon, Mic, RefreshCw } from 'lucide-react';
import './index.css';
import { supabase } from './supabase';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useVoiceSearch } from './hooks/useVoiceSearch';
import { ThemeProvider, useTheme } from './hooks/useTheme';
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
  const { dark, toggleTheme } = useTheme();
  const { toasts, addToast } = useToast();
  const { showPanel, setShowPanel, unreadCount } = useNotifications();
  const [page, setPage] = useState('home');
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const liveTimer = useRef(null);

  const handleVoiceResult = (transcript) => {
    setSearchQuery(transcript);
    nav('home');
  };
  const { listening, supported: voiceSupported, startListening } = useVoiceSearch(handleVoiceResult);

  const [detailId, setDetailId] = useState(null);
  const [vendeurId, setVendeurId] = useState(null);
  const [initialChat, setInitialChat] = useState(null);
  const [livraisonDetailId, setLivraisonDetailId] = useState(null);
  const [signalementAnnonceId, setSignalementAnnonceId] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      const s = window.scrollY > 40;
      if (s !== scrolled) setScrolled(s);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('db-changes');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'annonces' }, showLiveIndicator);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `destinataire_id=eq.${user.id}` }, showLiveIndicator);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'livraisons', filter: `acheteur_id=eq.${user.id}` }, showLiveIndicator);
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  function showLiveIndicator() {
    setLiveIndicator(true);
    if (liveTimer.current) clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(() => setLiveIndicator(false), 3000);
  }

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 20, background: 'var(--bg)' }}>
        <motion.img src="/logokb.png" alt="Konab Marcket"
          style={{ width: 60, height: 60, borderRadius: 16, objectFit: 'contain', background: 'white', padding: 4 }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="spinner" />
        <div style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>Konab Marcket — Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <motion.nav className={`navbar ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -80 }} animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}>
        <div className="navbar-inner">
          <motion.div className="navbar-logo" onClick={() => nav('home')}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <img src="/logokb.png" alt="Konab Marcket" className="logo-img" />
            <div className="logo-text">
              <span className="logo-name">Konab Marcket</span>
              <span className="logo-tagline">Achetez mieux • Vendez plus</span>
            </div>
          </motion.div>

          <div className="navbar-center">
            <div className="navbar-search" style={{ position: 'relative' }}>
              <Search size={16} style={{ marginLeft: 14, color: 'var(--text3)', flexShrink: 0 }} />
              <input placeholder="Rechercher produits, services, catégories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { nav('home'); } }} />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => { nav('home'); }}>
                <Search size={18} />
              </motion.button>
              {voiceSupported && (
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={startListening}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: listening ? 'var(--danger)' : 'var(--vert)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                    animation: listening ? 'pulse 1s infinite' : 'none',
                  }}>
                  <Mic size={14} />
                </motion.button>
              )}
            </div>
          </div>

          <div className="navbar-actions">
            {liveIndicator && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--vert)', background: 'rgba(57,211,83,0.1)', padding: '4px 10px', borderRadius: 100 }}>
                <RefreshCw size={12} className="spin-slow" /> LIVE
              </motion.div>
            )}

            <button className="theme-toggle" onClick={toggleTheme} title={dark ? 'Mode clair' : 'Mode sombre'}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user && (
              <div style={{ position: 'relative' }}>
                <NotifBell />
                <AnimatePresence>
                  {showPanel && <NotificationPanel onClose={() => setShowPanel(false)} />}
                </AnimatePresence>
              </div>
            )}

            <motion.button className="btn btn-primary btn-sm"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleCreateClick}>
              <Plus size={16} /> <span>Publier</span>
            </motion.button>

            {user ? (
              <div style={{ position: 'relative' }}>
                <motion.button className="nav-icon-btn"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setMenuOpen(m => !m)}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 12, fontWeight: 800 }}>{initials}</span>
                  }
                </motion.button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onClick={() => setMenuOpen(false)} />
                      <motion.div className="dropdown-menu"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}>
                        <div className="dropdown-header">{user.email}</div>
                        {profile?.abonnement && profile.abonnement !== 'basic' && (
                          <div style={{ padding: '4px 18px 10px' }}>
                            <span className="badge badge-gold">{profile.abonnement === 'certified' ? 'Certifié' : 'Premium'}</span>
                          </div>
                        )}
                        <div className="dropdown-separator" />
                        <button className="dropdown-item" onClick={() => nav('dashboard')}><LayoutDashboard size={16} /> Mon tableau de bord</button>
                        <button className="dropdown-item" onClick={() => { nav('messagerie'); setMenuOpen(false); }}><MessageCircle size={16} /> Messagerie</button>
                        <button className="dropdown-item" onClick={() => { nav('dashboard'); setMenuOpen(false); }}><Heart size={16} /> Mes favoris</button>
                        <button className="dropdown-item" onClick={() => { nav('categories'); setMenuOpen(false); }}><ShoppingBag size={16} /> Catégories</button>
                        <button className="dropdown-item" onClick={() => { nav('livreur'); setMenuOpen(false); }}><Bike size={16} /> Livraison</button>
                        <button className="dropdown-item" onClick={handleCreateClick}><Plus size={16} /> Publier une annonce</button>
                        {isAdmin && (<> <div className="dropdown-separator" /><button className="dropdown-item danger" onClick={() => nav('admin')}><Shield size={16} /> Administration</button></>)}
                        <div className="dropdown-separator" />
                        <button className="dropdown-item" onClick={handleSignOut} style={{ color: 'var(--text2)' }}><LogOut size={16} /> Déconnexion</button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button className="btn btn-ghost btn-sm"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowAuth(true)}>
                <User size={16} /> Connexion
              </motion.button>
            )}
          </div>
        </div>
      </motion.nav>

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

      <div className="bottom-nav">
        <div className="bottom-nav-inner">
          <button className={`bnav-item ${page === 'home' ? 'active' : ''}`} onClick={() => nav('home')}>
            <ShoppingBag size={20} className="bnav-icon" /> Accueil
          </button>
          <button className={`bnav-item ${page === 'categories' ? 'active' : ''}`} onClick={() => nav('categories')}>
            <Search size={20} className="bnav-icon" /> Catégories
          </button>
          <button className="bnav-item publish" onClick={handleCreateClick}>
            <div className="bnav-pub-btn"><Plus size={24} /></div> Publier
          </button>
          {user ? (
            <>
              <button className={`bnav-item ${page === 'messagerie' ? 'active' : ''}`} onClick={() => nav('messagerie')}>
                <MessageCircle size={20} className="bnav-icon" /> Messages
                {unreadCount > 0 && <span className="badge badge-danger" style={{ fontSize: 8, padding: '1px 5px', position: 'absolute', top: 2, right: 4 }}>{unreadCount}</span>}
              </button>
              <button className={`bnav-item ${page === 'livreur' ? 'active' : ''}`} onClick={() => nav('livreur')}>
                <Bike size={20} className="bnav-icon" /> Livraison
              </button>
              <button className={`bnav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => nav('dashboard')}>
                <LayoutDashboard size={20} className="bnav-icon" /> Dashboard
              </button>
            </>
          ) : (
            <>
              <button className="bnav-item" onClick={() => setShowAuth(true)}>
                <User size={20} className="bnav-icon" /> Connexion
              </button>
              <button className="bnav-item" onClick={() => nav('livreur')}>
                <Bike size={20} className="bnav-icon" /> Livraison
              </button>
            </>
          )}
        </div>
      </div>

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