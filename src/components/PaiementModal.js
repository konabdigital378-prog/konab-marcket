import { useState } from 'react';
import { supabase, USSD_CODE, FORMULAS } from '../supabase';
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
      // 1. Upload de la capture vers Supabase Storage (bucket captures)
      const ext = capture.name.split('.').pop().toLowerCase() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;

      setUploadProgress(30);
      const { error: upErr } = await supabase.storage
        .from('captures')
        .upload(path, capture, { upsert: true, contentType: capture.type });

      if (upErr) throw new Error('Erreur lors de l\'envoi de la capture : ' + upErr.message);

      setUploadProgress(60);

      // 2. Récupérer l'URL publique
      const { data: urlData } = supabase.storage.from('captures').getPublicUrl(path);
      const capture_url = urlData.publicUrl;

      setUploadProgress(80);

      // 3. Enregistrer la demande dans la table paiements
      const { error: dbErr } = await supabase.from('paiements').insert({
        user_id: user.id,
        formule,
        montant,
        capture_url,
        statut: 'en_attente',
      });

      if (dbErr) throw new Error('Erreur d\'enregistrement : ' + dbErr.message);

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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="flag-strip" />
        <div className="modal-header">
          <div>
            <h3>💳 Abonnement {info.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, fontWeight: 400 }}>
              {montant.toLocaleString('fr-FR')} FCFA / mois — Paiement Orange Money
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* ===== SUCCÈS ===== */}
          {sent ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 70, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 20, marginBottom: 10 }}>Demande envoyée avec succès !</h3>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: 8 }}>
                Votre preuve de paiement a été transmise directement à l'administrateur Konab Marcket.
              </p>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: 28 }}>
                Votre abonnement <strong>{info.name}</strong> sera activé dans les <strong>24 heures</strong> suivant la validation.
              </p>

              {/* Récapitulatif */}
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '14px 18px', marginBottom: 24, textAlign: 'left', border: '1.5px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Récapitulatif de votre demande</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Compte</span>
                    <span style={{ fontWeight: 700 }}>{profile?.nom || user?.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Formule</span>
                    <span style={{ fontWeight: 700 }}>{info.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Montant</span>
                    <span style={{ fontWeight: 800, color: 'var(--vert)' }}>{montant.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text3)' }}>Statut</span>
                    <span className="badge badge-warning">⏳ En attente de validation</span>
                  </div>
                </div>
              </div>

              <button className="btn btn-vert btn-full btn-lg"
                style={{ borderRadius: 'var(--radius-sm)' }} onClick={onClose}>
                Retour à mon tableau de bord
              </button>
            </div>

          ) : (
            /* ===== FORMULAIRE ===== */
            <>
              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                📋 Effectuez le paiement Orange Money puis joignez la capture du reçu. Votre demande sera envoyée directement à l'administrateur.
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                  ⚠️ {error}
                </div>
              )}

              <div className="payment-steps">

                {/* ÉTAPE 1 — PAIEMENT USSD */}
                <div className="payment-step">
                  <div className="step-num">1</div>
                  <div style={{ flex: 1 }}>
                    <div className="step-title">Effectuez le paiement Orange Money</div>
                    <div className="step-body" style={{ marginBottom: 10 }}>
                      Composez ce code USSD depuis votre téléphone ou ouvrez le composeur :
                    </div>
                    <div className="ussd-code">{ussd}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <button className="btn btn-rouge btn-sm" onClick={openDialer}>
                        📱 Composer le code
                      </button>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => { navigator.clipboard?.writeText(ussd); }}>
                        📋 Copier le code
                      </button>
                    </div>
                    <div style={{ marginTop: 10, background: 'var(--bg)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text3)' }}>Destinataire</span>
                        <strong>65413799</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text3)' }}>Montant</span>
                        <strong style={{ color: 'var(--vert)' }}>{montant.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ÉTAPE 2 — CAPTURE */}
                <div className="payment-step">
                  <div className="step-num">2</div>
                  <div style={{ flex: 1 }}>
                    <div className="step-title">
                      Joignez la capture du reçu <span style={{ color: 'var(--rouge)' }}>*</span>
                    </div>
                    <div className="step-body" style={{ marginBottom: 10 }}>
                      Après le paiement, prenez une capture d'écran du message de confirmation Orange Money et joignez-la ici.
                    </div>

                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <input type="file" accept="image/*" onChange={handleCapture} style={{ display: 'none' }} />
                      <div className={`upload-zone ${capturePreview ? 'has-img' : ''}`}
                        style={{ padding: capturePreview ? 0 : 20, minHeight: capturePreview ? 'auto' : 100 }}>
                        {capturePreview
                          ? <img src={capturePreview} alt="capture reçu" className="img-preview" />
                          : (
                            <div>
                              <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
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
                        style={{ background: 'none', border: 'none', color: 'var(--rouge)', fontSize: 12, cursor: 'pointer', marginTop: 6, fontWeight: 700 }}>
                        ✕ Changer de capture
                      </button>
                    )}
                  </div>
                </div>

                {/* ÉTAPE 3 — ENVOI */}
                <div className="payment-step" style={{ background: capture ? '#E8F5E9' : 'var(--bg)', borderColor: capture ? '#A5D6A7' : 'var(--border)' }}>
                  <div className="step-num" style={{ background: capture ? 'var(--vert)' : 'var(--text3)' }}>3</div>
                  <div>
                    <div className="step-title">Envoyez directement à l'administrateur</div>
                    <div className="step-body">
                      Votre demande et votre reçu seront transmis <strong>directement dans le panneau admin</strong> de Konab Marcket — sans passer par WhatsApp. L'admin validera votre abonnement sous 24h.
                    </div>
                  </div>
                </div>
              </div>

              {/* Barre de progression */}
              {loading && (
                <div style={{ margin: '16px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                    <span>Envoi en cours...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--vert)', borderRadius: 3, width: `${uploadProgress}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )}

              {/* BOUTONS */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-outline" style={{ borderRadius: 'var(--radius-sm)' }}
                  onClick={onClose} disabled={loading}>
                  Annuler
                </button>
                <button
                  className="btn btn-vert"
                  disabled={loading || !capture}
                  style={{
                    flex: 1, justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    opacity: (!capture || loading) ? 0.5 : 1,
                    fontSize: 15, padding: '12px'
                  }}
                  onClick={handleSend}
                >
                  {loading
                    ? <span style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><span className="btn-spinner" /> Envoi... {uploadProgress}%</span>
                    : !capture
                      ? '📸 Joignez d\'abord le reçu'
                      : '📤 Envoyer ma demande à l\'admin'
                  }
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
                🔒 Votre demande est sécurisée et transmise directement à l'administrateur Konab Marcket
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
