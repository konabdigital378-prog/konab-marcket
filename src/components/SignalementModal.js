import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Flag, CheckCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';

const MOTIFS = [
  { value: 'spam', label: 'Spam ou contenu trompeur', icon: '🚫' },
  { value: 'fraude', label: 'Fraude ou arnaque', icon: '⚠️' },
  { value: 'contenu_inapproprie', label: 'Contenu inapproprié', icon: '🔞' },
  { value: 'produit_indisponible', label: 'Produit déjà vendu / indisponible', icon: '📦' },
  { value: 'autre', label: 'Autre motif', icon: '💬' },
];

export default function SignalementModal({ annonceId, onClose, onSent }) {
  const { user } = useAuth();
  const [motif, setMotif] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!motif) { setError('Veuillez sélectionner un motif'); return; }
    setLoading(true);
    setError('');

    const { error: dbErr } = await supabase.from('signalements').insert({
      annonce_id: annonceId,
      signalant_id: user.id,
      motif,
      description,
    });

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setSent(true);
      if (onSent) onSent();
    }
    setLoading(false);
  }

  return (
    <motion.div className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="modal" style={{ maxWidth: 460 }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flag-strip" />
        <div className="modal-header">
          <h3><Flag size={18} style={{ display: 'inline', marginRight: 8 }} /> Signaler une annonce</h3>
          <motion.button className="modal-close" onClick={onClose}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <X size={18} />
          </motion.button>
        </div>
        <div className="modal-body">
          {sent ? (
            <motion.div style={{ textAlign: 'center', padding: '24px 0' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle size={60} style={{ color: 'var(--vert)', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'white' }}>Signalement envoyé</h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
                Notre équipe examinera votre signalement dans les plus brefs délais.
              </p>
              <motion.button className="btn btn-primary" onClick={onClose}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Fermer
              </motion.button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
                Pourquoi souhaitez-vous signaler cette annonce ?
              </p>

              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <div className="signalement-options">
                {MOTIFS.map(m => (
                  <div key={m.value}
                    className={`signalement-option ${motif === m.value ? 'selected' : ''}`}
                    onClick={() => setMotif(m.value)}
                  >
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: 'white' }}>{m.label}</span>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${motif === m.value ? 'var(--vert)' : 'var(--border)'}`,
                      background: motif === m.value ? 'var(--vert)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {motif === m.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Détails (optionnel)</label>
                <textarea className="form-control"
                  placeholder="Ajoutez des précisions..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button type="button" className="btn btn-ghost"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={onClose} disabled={loading}>
                  Annuler
                </motion.button>
                <motion.button type="submit" className="btn btn-primary"
                  disabled={loading || !motif}
                  style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
                  whileHover={{ scale: (loading || !motif) ? 1 : 1.02 }}
                  whileTap={{ scale: (loading || !motif) ? 1 : 0.98 }}>
                  {loading ? <><span className="btn-spinner" /> Envoi...</> : 'Envoyer le signalement'}
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}