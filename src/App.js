import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, User, LogOut, LayoutDashboard, Shield, ShoppingBag, Heart, MessageCircle } from 'lucide-react';
import './index.css';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useToast, ToastContainer } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import AuthModal from './components/AuthModal';
import AnnonceModal from './components/AnnonceModal';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AnnonceDetailPage from './pages/AnnonceDetailPage';
import VendeurPage from './pages/VendeurPage';
import MessageriePage from './pages/MessageriePage';

function AppInner() {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const { toasts, addToast } = useToast();
  const [page, setPage] = useState('home');
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const [detailId, setDetailId] = useState(null);
  const [vendeurId, setVendeurId] = useState(null);
  const [initialChat, setInitialChat] = useState(null);

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40 && !scrolled) setScrolled(true);
      if (window.scrollY <= 40 && scrolled) setScrolled(false);
    }, { passive: true });
  }

  function nav(p) { setPage(p); setMenuOpen(false); window.scrollTo(0, 0); }

  function showDetail(annonceId) {
    setDetailId(annonceId);
    nav('detail');
  }

  function showVendeur(id) {
    setVendeurId(id);
    nav('vendeur');
  }

  function startChat(annonce, vendeur) {
    setInitialChat({ annonceId: annonce?.id, vendeurId: vendeur?.id || annonce?.user_id, annonceTitle: annonce?.titre });
    setPage('messagerie');
  }

  function handleCreateClick() {
    if (!user) { setShowAuth(true); return; }
    setShowCreate(true);
  }

  function handleSignOut() {
    signOut();
    nav('home');
    addToast('Déconnexion réussie', 'success');
  }

  function handleBackFromDetail() {
    nav('home');
  }

  const initials = (profile?.nom || user?.email || '?').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 20, background: 'var(--bg)' }}>
        <motion.img
          src="/logokb.png" alt="Konab Marcket"
          style={{ width: 60, height: 60, borderRadius: 16, objectFit: 'contain', background: 'white', padding: 4 }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="spinner" />
        <div style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>Konab Marcket — Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <motion.nav
        className={`navbar ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="navbar-inner">
          <motion.div className="navbar-logo" onClick={() => nav('home')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img src="/logokb.png" alt="Konab Marcket" className="logo-img" />
            <div className="logo-text">
              <span className="logo-name">Konab Marcket</span>
              <span className="logo-tagline">Achetez mieux • Vendez plus</span>
            </div>
          </motion.div>

          <div className="navbar-center">
            <div className="navbar-search">
              <Search size={16} style={{ marginLeft: 14, color: 'var(--text3)', flexShrink: 0 }} />
              <input placeholder="Rechercher produits, services, catégories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { nav('home'); } }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { nav('home'); }}
              >
                <Search size={18} />
              </motion.button>
            </div>
          </div>

          <div className="navbar-actions">
            <motion.button className="btn btn-primary btn-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCreateClick}
            >
              <Plus size={16} />
              <span>Publier</span>
            </motion.button>

            {user ? (
              <div style={{ position: 'relative' }}>
                <motion.button className="nav-icon-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMenuOpen(m => !m)}
                >
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{initials}</span>
                </motion.button>

                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onClick={() => setMenuOpen(false)} />
                      <motion.div className="dropdown-menu"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="dropdown-header">{user.email}</div>
                        {profile?.abonnement && profile.abonnement !== 'basic' && (
                          <div style={{ padding: '4px 18px 10px' }}>
                            <span className="badge badge-gold">
                              {profile.abonnement === 'certified' ? 'Certifié' : 'Premium'}
                            </span>
                          </div>
                        )}
                        <div className="dropdown-separator" />
                        <button className="dropdown-item" onClick={() => nav('dashboard')}>
                          <LayoutDashboard size={16} /> Mon tableau de bord
                        </button>
                        <button className="dropdown-item" onClick={() => { nav('messagerie'); setMenuOpen(false); }}>
                          <MessageCircle size={16} /> Messagerie
                        </button>
                        <button className="dropdown-item" onClick={() => { nav('dashboard'); setMenuOpen(false); }}>
                          <Heart size={16} /> Mes favoris
                        </button>
                        <button className="dropdown-item" onClick={handleCreateClick}>
                          <Plus size={16} /> Publier une annonce
                        </button>
                        {isAdmin && (
                          <>
                            <div className="dropdown-separator" />
                            <button className="dropdown-item danger" onClick={() => nav('admin')}>
                              <Shield size={16} /> Administration
                            </button>
                          </>
                        )}
                        <div className="dropdown-separator" />
                        <button className="dropdown-item" onClick={handleSignOut} style={{ color: 'var(--text2)' }}>
                          <LogOut size={16} /> Déconnexion
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button className="btn btn-ghost btn-sm"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAuth(true)}
              >
                <User size={16} /> Connexion
              </motion.button>
            )}
          </div>
        </div>
      </motion.nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={page + (detailId || '') + (vendeurId || '')}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {page === 'home'      && <HomePage key={searchQuery} searchQuery={searchQuery}
            onShowAuth={() => setShowAuth(true)} onShowCreate={handleCreateClick}
            onShowDetail={showDetail} onShowVendeur={showVendeur} />}
          {page === 'dashboard' && user    && <DashboardPage onShowCreate={() => setShowCreate(true)} />}
          {page === 'admin'     && isAdmin && <AdminPage />}
          {page === 'detail'    && <AnnonceDetailPage annonceId={detailId}
            onBack={handleBackFromDetail} onShowAuth={() => setShowAuth(true)}
            onStartChat={startChat} />}
          {page === 'vendeur'   && <VendeurPage vendeurId={vendeurId}
            onBack={handleBackFromDetail} onShowDetail={showDetail} />}
          {page === 'messagerie' && <MessageriePage
            onBack={() => nav('home')} initialChat={initialChat}
            onShowDetail={showDetail} />}
        </motion.div>
      </AnimatePresence>

      <div className="bottom-nav">
        <div className="bottom-nav-inner">
          <button className={`bnav-item ${page === 'home' ? 'active' : ''}`} onClick={() => nav('home')}>
            <ShoppingBag size={20} className="bnav-icon" />
            Accueil
          </button>
          <button className={`bnav-item ${page === 'home' ? 'active' : ''}`} onClick={() => nav('home')}>
            <Search size={20} className="bnav-icon" />
            Chercher
          </button>
          <button className="bnav-item publish" onClick={handleCreateClick}>
            <div className="bnav-pub-btn"><Plus size={24} /></div>
            Publier
          </button>
          {user ? (
            <>
              <button className={`bnav-item ${page === 'messagerie' ? 'active' : ''}`} onClick={() => nav('messagerie')}>
                <MessageCircle size={20} className="bnav-icon" />
                Messages
              </button>
              <button className={`bnav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => nav('dashboard')}>
                <LayoutDashboard size={20} className="bnav-icon" />
                Dashboard
              </button>
            </>
          ) : (
            <button className="bnav-item" onClick={() => setShowAuth(true)}>
              <User size={20} className="bnav-icon" />
              Connexion
            </button>
          )}
          {!user && isAdmin ? (
            <button className={`bnav-item ${page === 'admin' ? 'active' : ''}`} onClick={() => nav('admin')}>
              <Shield size={20} className="bnav-icon" />
              Admin
            </button>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {showAuth && (
          <AuthModal onClose={() => setShowAuth(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && user && (
          <AnnonceModal
            onClose={() => setShowCreate(false)}
            onSaved={() => { setShowCreate(false); addToast('Annonce publiée avec succès !', 'success'); }}
          />
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
        <AppInner />
      </AuthProvider>
    </ErrorBoundary>
  );
}
