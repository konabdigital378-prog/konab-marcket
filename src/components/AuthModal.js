import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, X, Sparkles, LogIn, Camera } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, SUPABASE_URL } from '../supabase';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', nom: '', telephone: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signIn, signUp } = useAuth();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image trop lourde (max 2MB)'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

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
        if (!form.telephone.trim()) throw new Error('Le numéro WhatsApp est requis');

        let avatarUrl = '';
        if (avatarFile) {
          const ext = avatarFile.name.split('.').pop().toLowerCase() || 'jpg';
          const path = `temp/${Date.now()}.${ext}`;
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (token) {
            const uploadUrl = `${SUPABASE_URL}/storage/v1/object/avatars/${path}`;
            const res = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': avatarFile.type, 'x-upsert': 'true' },
              body: avatarFile,
            });
            if (res.ok) {
              const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
              avatarUrl = publicUrl;
            }
          }
        }

        await signUp(form.email, form.password, form.nom.trim(), form.telephone.trim(), avatarUrl);
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
    <motion.div className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="modal" style={{ maxWidth: 440 }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="flag-strip" />
        <div className="modal-header" style={{ borderTop: 'none' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {mode === 'login' ? <LogIn size={20} /> : <Sparkles size={20} />}
              {mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, fontWeight: 400 }}>
              {mode === 'login' ? 'Accédez à votre espace Konab Marcket' : 'Rejoignez la marketplace intelligente'}
            </p>
          </div>
          <motion.button className="modal-close" onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={18} />
          </motion.button>
        </div>

        <div className="modal-body">
          <div className="auth-tabs">
            <motion.button className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            >
              <LogIn size={14} style={{ marginRight: 4, display: 'inline' }} /> Se connecter
            </motion.button>
            <motion.button className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
            >
              <Sparkles size={14} style={{ marginRight: 4, display: 'inline' }} /> S'inscrire
            </motion.button>
          </div>

          {success && (
            <motion.div className="alert alert-info"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <span>✅</span>
              <span>{success}</span>
            </motion.div>
          )}

          {error && (
            <motion.div className="alert alert-danger"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <User size={12} style={{ marginRight: 4, display: 'inline' }} /> Nom complet <span className="form-required">*</span>
                  </label>
                  <input className="form-control" placeholder="Ex: Moussa Ouédraogo" value={form.nom}
                    onChange={e => set('nom', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Phone size={12} style={{ marginRight: 4, display: 'inline' }} /> Numéro WhatsApp <span className="form-required">*</span>
                  </label>
                  <input className="form-control" placeholder="+226 XX XX XX XX" value={form.telephone}
                    onChange={e => set('telephone', e.target.value)} />
                  <p className="form-hint">📱 Les clients vous contacteront sur ce numéro</p>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Camera size={12} style={{ marginRight: 4, display: 'inline' }} /> Photo de profil
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <label style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                    }}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Camera size={20} style={{ color: 'var(--text3)' }} />
                      }
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                    </label>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>Ajoutez une photo</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>PNG, JPG max 2MB</div>
                    </div>
                    {avatarPreview && (
                      <motion.button type="button" className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, padding: '4px 10px', color: 'var(--danger)' }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setAvatarFile(null); setAvatarPreview(''); }}>
                        Suppr.
                      </motion.button>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">
                <Mail size={12} style={{ marginRight: 4, display: 'inline' }} /> Adresse email <span className="form-required">*</span>
              </label>
              <input className="form-control" type="email" placeholder="votre@email.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={12} style={{ marginRight: 4, display: 'inline' }} /> Mot de passe <span className="form-required">*</span>
              </label>
              <input className="form-control" type="password"
                placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••'}
                value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>

            <motion.button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ borderRadius: 'var(--radius-sm)', marginTop: 8 }}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span className="btn-spinner" /> Chargement...
                  </span>
                : mode === 'login'
                  ? <><LogIn size={18} /> Me connecter</>
                  : <><Sparkles size={18} /> Créer mon compte gratuitement</>
              }
            </motion.button>
          </form>

          {mode === 'register' && (
            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              En créant un compte, vous acceptez les conditions d'utilisation de Konab Marcket.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
