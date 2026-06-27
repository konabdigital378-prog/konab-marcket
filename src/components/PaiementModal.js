import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CreditCard, Copy, Phone, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { supabase, USSD_CODE, FORMULAS, SUPABASE_URL } from '../supabase';
import { useAuth } from '../hooks/useAuth';

export default function PaiementModal({ formule, onClose, onSuccess }) {
  const { user, profile } = useAuth();
  const [capture, setCapture] = useState(null);
  const [capturePreview, setCapturePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const info = FORMULAS[formule] || FORMULAS.premium;
  const montant = info.price;
  const ussd = `${USSD_CODE}*${montant}#`;

  function handleCapture(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image trop lourde (max 10MB)'); return; }
    setCapture(file);
    setCapturePreview(URL.createObjectURL(file));
    setError('');
  }

  function openDialer() {
    window.location.href = `tel:${ussd}`;
  }

  async function handleSend() {
    if (!capture) { setError('Veuillez joindre la capture du reçu de paiement'); return; }
    setError('');
    setLoading(true);
    setUploadProgress(10);

    try {
      const ext = capture.name.split('.').pop().toLowerCase() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;

      setUploadProgress(30);
      const { data: { session }, error: sesErr } = await supabase.auth.getSession();
      if (sesErr || !session) throw new Error('Session expirée, reconnectez-vous');
      if (session.expires_at && Date.now() / 1000 > session.expires_at) {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) throw new Error('Session expirée, reconnectez-vous');
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (!s2) throw new Error('Session expirée, reconnectez-vous');
        session.access_token = s2.access_token;
      }

      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/captures/${path}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': capture.type,
          'x-upsert': 'true',
        },
        body: capture,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error('Erreur lors de l\'envoi de la capture : ' + errText);
      }

      setUploadProgress(60);

      const { data: urlData } = supabase.storage.from('captures').getPublicUrl(path);
      const capture_url = urlData.publicUrl;

      setUploadProgress(80);

      const { data: paiementData, error: dbErr } = await supabase.from('paiements').insert({
        user_id: user.id,
        formule,
        montant,
        capture_url,
        statut: 'en_attente',
      }).select().single();

      if (dbErr) throw new Error('Erreur d\'enregistrement : ' + dbErr.message);

      try {
        const { data: adminProfiles } = await supabase.from('profiles')
          .select('id').eq('email', 'admin@gmail.com').maybeSingle();
        if (adminProfiles) {
          await supabase.rpc('creer_notification', {
            p_user_id: adminProfiles.id,
            p_type: 'abonnement',
            p_title: 'Nouvelle demande d\'abonnement',
            p_body: `${profile?.nom || 'Un utilisateur'} a demandé l'abonnement ${info.name}`,
            p_data: JSON.stringify({ paiement_id: paiementData?.id }),
          });
        }
      } catch (_) {}

      setUploadProgress(100);
      setSent(true);
      if (onSuccess) onSuccess();

    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez.');
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
      <motion.div className="modal" style={{ maxWidth: 520 }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flag-strip" />
        <div className="modal-header">
          <div>
            <h3><CreditCard size={18} style={{ display: 'inline', marginRight: 6 }} /> Abonnement {info.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, fontWeight: 400 }}>
              {montant.toLocaleString('fr-FR')} FCFA / mois — Paiement Orange Money
            </p>
          </div>
          <motion.button className="modal-close" onClick={onClose}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          >
            <X size={18} />
          </motion.button>
        </div>

        <div className="modal-body">
          {sent ? (
            <motion.div style={{ textAlign: 'center', padding: '32px 0' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div style={{ fontSize: 70, marginBottom: 16 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CheckCircle size={70} style={{ color: 'var(--vert)' }} />
              </motion.div>
              <h3 style={{ fontSize: 20, marginBottom: 10, color: 'white' }}>Demande envoyée avec succès !</h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
                Votre preuve de paiement a été transmise à l'administrateur Konab Marcket.
              </p>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: 28 }}>
                Votre abonnement <strong>{info.name}</strong> sera activé dans les <strong>24 heures</strong>.
              </p>

              <div className="card-surface" style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Récapitulatif</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Compte</span>
                    <span style={{ fontWeight: 700, color: 'white' }}>{profile?.nom || user?.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Formule</span>
                    <span style={{ fontWeight: 700, color: 'white' }}>{info.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Montant</span>
                    <span style={{ fontWeight: 800, color: 'var(--vert)' }}>{montant.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Statut</span>
                    <span className="badge badge-warning">⏳ En attente</span>
                  </div>
                </div>
              </div>

              <motion.button className="btn btn-primary btn-full btn-lg"
                style={{ borderRadius: 'var(--radius-sm)', marginTop: 20 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
              >
                Retour au tableau de bord
              </motion.button>
            </motion.div>
          ) : (
            <>
              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                Effectuez le paiement Orange Money puis joignez la capture du reçu.
              </div>

              {error && (
                <motion.div className="alert alert-danger"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <div className="payment-steps">
                <div className="payment-step">
                  <div className="step-num">1</div>
                  <div style={{ flex: 1 }}>
                    <div className="step-title">Paiement Orange Money</div>
                    <div className="step-body" style={{ marginBottom: 10 }}>
                      Composez ce code USSD depuis votre téléphone :
                    </div>
                    <div className="ussd-code">{ussd}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <motion.button className="btn btn-primary btn-sm"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={openDialer}
                      >
                        <Phone size={14} /> Composer le code
                      </motion.button>
                      <motion.button className="btn btn-ghost btn-sm"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { navigator.clipboard?.writeText(ussd); }}
                      >
                        <Copy size={14} /> Copier
                      </motion.button>
                    </div>
                    <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-xs)', padding: '10px 14px', fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text3)' }}>Destinataire</span>
                        <strong style={{ color: 'white' }}>65413799</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text3)' }}>Montant</span>
                        <strong style={{ color: 'var(--vert)' }}>{montant.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="payment-step">
                  <div className="step-num">2</div>
                  <div style={{ flex: 1 }}>
                    <div className="step-title">
                      Joignez la capture du reçu <span style={{ color: 'var(--danger)' }}>*</span>
                    </div>
                    <div className="step-body" style={{ marginBottom: 10 }}>
                      Après le paiement, prenez une capture d'écran du message de confirmation.
                    </div>

                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <input type="file" accept="image/*" onChange={handleCapture} style={{ display: 'none' }} />
                      <div className={`upload-zone ${capturePreview ? 'has-img' : ''}`}
                        style={{ padding: capturePreview ? 0 : 20, minHeight: capturePreview ? 'auto' : 100 }}>
                        {capturePreview
                          ? <img src={capturePreview} alt="capture" className="img-preview" />
                          : (
                            <div>
                              <div style={{ fontSize: 32, marginBottom: 8, color: 'var(--text3)' }}>
                                <ImageIcon size={32} style={{ margin: '0 auto' }} />
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
                                Cliquez pour joindre votre reçu
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text3)' }}>JPG, PNG — max 10MB</div>
                            </div>
                          )
                        }
                      </div>
                    </label>

                    {capturePreview && (
                      <button type="button"
                        onClick={() => { setCapturePreview(''); setCapture(null); }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', marginTop: 6, fontWeight: 700 }}>
                        ✕ Changer de capture
                      </button>
                    )}
                  </div>
                </div>

                <div className="payment-step" style={{ background: capture ? 'rgba(57,211,83,0.05)' : 'rgba(255,255,255,0.03)', borderColor: capture ? 'rgba(57,211,83,0.3)' : 'var(--border)' }}>
                  <div className="step-num" style={{ background: capture ? 'var(--vert)' : 'var(--text3)' }}>3</div>
                  <div>
                    <div className="step-title">Envoyez à l'administrateur</div>
                    <div className="step-body">
                      Votre demande sera transmise directement dans le panneau admin de Konab Marcket.
                    </div>
                  </div>
                </div>
              </div>

              {loading && (
                <div style={{ margin: '18px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                    <span>Envoi en cours...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, var(--vert), var(--vert-dark))', borderRadius: 3 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <motion.button className="btn btn-ghost"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose} disabled={loading}>
                  Annuler
                </motion.button>
                <motion.button className="btn btn-primary"
                  disabled={loading || !capture}
                  style={{
                    flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)',
                    opacity: (!capture || loading) ? 0.5 : 1, fontSize: 15, padding: '12px'
                  }}
                  whileHover={{ scale: (!capture || loading) ? 1 : 1.02 }}
                  whileTap={{ scale: (!capture || loading) ? 1 : 0.98 }}
                  onClick={handleSend}
                >
                  {loading
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <span className="btn-spinner" /> Envoi... {uploadProgress}%
                      </span>
                    : <><CreditCard size={18} /> Envoyer ma demande</>
                  }
                </motion.button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                🔒 Votre demande est sécurisée et transmise directement à l'administrateur
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
