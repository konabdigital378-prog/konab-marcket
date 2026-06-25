import './index.css';
import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useToast, ToastContainer } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import AuthModal from './components/AuthModal';
import AnnonceModal from './components/AnnonceModal';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';

function AppInner() {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const { toasts, addToast } = useToast();
  const [page, setPage] = useState('home');
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  function nav(p) { setPage(p); setMenuOpen(false); window.scrollTo(0, 0); }

  function handleCreateClick() {
    if (!user) { setShowAuth(true); return; }
    setShowCreate(true);
  }

  function handleSignOut() {
    signOut();
    nav('home');
    addToast('✅ Déconnexion réussie', 'success');
  }

  const initials = (profile?.nom || user?.email || '?').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
        <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--rouge) 33%, var(--vert) 33% 66%, var(--or) 66%)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', marginBottom: 8 }}>🛍</div>
        <div className="spinner" />
        <div style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500, marginTop: 8 }}>KonabMarcket — Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      {/* ===== NAVBAR ===== */}
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <div className="navbar-logo" onClick={() => nav('home')}>
            <div className="logo-emblem">🛍</div>
            <div className="logo-text">
              <span className="logo-name">KonabMarcket</span>
              <span className="logo-tagline">🇧🇫 Marketplace</span>
            </div>
          </div>

          {/* Search — desktop seulement */}
          <div className="navbar-center">
            <div className="navbar-search">
              <input placeholder="Rechercher sur KonabMarcket..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { nav('home'); } }}
              />
              <button onClick={() => { setSearchQuery(searchQuery); nav('home'); }}>🔍</button>
            </div>
          </div>

          {/* Actions */}
          <div className="navbar-actions">
            <button className="btn btn-rouge btn-sm" onClick={handleCreateClick}>
              ➕ <span style={{ display: 'none' }} className="hide-sm">Publier</span>
              <span>Publier</span>
            </button>

            {user ? (
              <div style={{ position: 'relative' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(m => !m)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--rouge),var(--vert))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile?.nom?.split(' ')[0] || 'Compte'}
                  </span>
                  <span style={{ fontSize: 10 }}>▾</span>
                </button>

                {menuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onClick={() => setMenuOpen(false)} />
                    <div className="dropdown-menu">
                      <div className="dropdown-header">{user.email}</div>
                      {profile?.abonnement && profile.abonnement !== 'basic' && (
                        <div style={{ padding: '4px 16px 10px' }}>
                          <span className="badge badge-gold">⭐ {profile.abonnement === 'certified' ? 'Certifié' : 'Premium'}</span>
                        </div>
                      )}
                      <div className="dropdown-separator" />
                      <button className="dropdown-item" onClick={() => nav('dashboard')}>
                        📋 Mon tableau de bord
                      </button>
                      <button className="dropdown-item" onClick={handleCreateClick}>
                        ➕ Publier une annonce
                      </button>
                      {isAdmin && (
                        <>
                          <div className="dropdown-separator" />
                          <button className="dropdown-item danger" onClick={() => nav('admin')}>
                            🛡️ Administration
                          </button>
                        </>
                      )}
                      <div className="dropdown-separator" />
                      <button className="dropdown-item" onClick={handleSignOut} style={{ color: 'var(--text2)' }}>
                        🚪 Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button className="btn btn-outline-blanc btn-sm" onClick={() => setShowAuth(true)}>
                🔐 Connexion
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ===== PAGES ===== */}
      <div className="page-enter" key={page}>
        {page === 'home'      && <HomePage key={searchQuery} searchQuery={searchQuery} onShowAuth={() => setShowAuth(true)} onShowCreate={handleCreateClick} />}
        {page === 'dashboard' && user    && <DashboardPage onShowCreate={() => setShowCreate(true)} />}
        {page === 'admin'     && isAdmin && <AdminPage />}
      </div>

      {/* ===== BOTTOM NAV MOBILE ===== */}
      <div className="bottom-nav">
        <div className="bottom-nav-inner">
          <button className={`bnav-item ${page === 'home' ? 'active' : ''}`} onClick={() => nav('home')}>
            <span className="bnav-icon">🏠</span>
            Accueil
          </button>
          <button className={`bnav-item ${page === 'home' && searchQuery ? 'active' : ''}`} onClick={() => nav('home')}>
            <span className="bnav-icon">🔍</span>
            Chercher
          </button>
          <button className="bnav-item publish" onClick={handleCreateClick}>
            <div className="bnav-pub-btn">➕</div>
            Publier
          </button>
          {user ? (
            <button className={`bnav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => nav('dashboard')}>
              <span className="bnav-icon">📋</span>
              Mes annonces
            </button>
          ) : (
            <button className="bnav-item" onClick={() => setShowAuth(true)}>
              <span className="bnav-icon">🔐</span>
              Connexion
            </button>
          )}
          {isAdmin ? (
            <button className={`bnav-item ${page === 'admin' ? 'active' : ''}`} onClick={() => nav('admin')}>
              <span className="bnav-icon">🛡️</span>
              Admin
            </button>
          ) : user ? (
            <button className="bnav-item" onClick={() => nav('dashboard')}>
              <span className="bnav-icon">👤</span>
              Profil
            </button>
          ) : null}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showCreate && user && (
        <AnnonceModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); addToast('🎉 Annonce publiée avec succès !', 'success'); }}
        />
      )}

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
