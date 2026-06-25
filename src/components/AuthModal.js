import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', nom: '', telephone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signIn, signUp } = useAuth();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password);
        onClose();
      } else {
        if (!form.nom.trim()) throw new Error('Le nom complet est requis');
        if (form.password.length < 6) throw new Error('Mot de passe : 6 caractères minimum');
        if (!form.telephone.trim()) throw new Error('Le numéro WhatsApp est requis pour publier des annonces');
        await signUp(form.email, form.password, form.nom.trim(), form.telephone.trim());
        setSuccess('Compte créé avec succès ! Vérifiez votre boîte email pour confirmer, puis connectez-vous.');
        setMode('login');
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('Cet email est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.');
      } else if (msg.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email avant de vous connecter.');
      } else {
        setError(msg || 'Une erreur est survenue. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="flag-strip" />
        <div className="modal-header" style={{ borderTop: 'none' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🇧🇫 {mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, fontWeight: 400 }}>
              {mode === 'login' ? 'Accédez à votre espace Konab Marcket' : 'Rejoignez la marketplace du Burkina Faso'}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Auth tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
              🔐 Se connecter
            </button>
            <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
              ✨ S'inscrire
            </button>
          </div>

          {success && (
            <div className="alert alert-info">
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="alert alert-danger">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">Nom complet <span className="form-required">*</span></label>
                  <input className="form-control" placeholder="Ex: Moussa Ouédraogo" value={form.nom}
                    onChange={e => set('nom', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Numéro WhatsApp <span className="form-required">*</span></label>
                  <input className="form-control" placeholder="+226 XX XX XX XX" value={form.telephone}
                    onChange={e => set('telephone', e.target.value)} />
                  <p className="form-hint">📱 Les clients vous contacteront sur ce numéro</p>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Adresse email <span className="form-required">*</span></label>
              <input className="form-control" type="email" placeholder="votre@email.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe <span className="form-required">*</span></label>
              <input className="form-control" type="password"
                placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••'}
                value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-vert btn-full btn-lg" disabled={loading}
              style={{ marginTop: 4, borderRadius: 'var(--radius-sm)' }}>
              {loading
                ? <span style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><span className="btn-spinner" /> Chargement...</span>
                : mode === 'login'
                  ? '🚀 Me connecter'
                  : '✅ Créer mon compte gratuitement'
              }
            </button>
          </form>

          {mode === 'register' && (
            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              En créant un compte, vous acceptez les conditions d'utilisation de Konab Marcket.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
