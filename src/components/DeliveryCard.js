import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { Truck, CheckCircle, X, Camera } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';

export function DeliveryCard({ livraison, livreurNom, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        border: '2px solid rgba(57,211,83,0.3)',
        borderRadius: 20,
        padding: 0,
        overflow: 'hidden',
        maxWidth: 380,
        margin: '0 auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(57,211,83,0.1)',
        ...style,
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, var(--vert) 0%, var(--vert-dark) 100%)',
        padding: '20px 24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logokb.png" alt="Konab Marcket"
            style={{ width: 42, height: 42, borderRadius: 12, border: '2px solid rgba(255,255,255,0.3)' }} />
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 16, letterSpacing: 0.5 }}>KONAB MARCKET</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, letterSpacing: 2 }}>CARTE DE LIVRAISON</div>
          </div>
        </div>
        <Truck size={24} color="rgba(255,255,255,0.8)" />
      </div>

      <div style={{ padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Coursier</div>
        <div style={{ color: 'white', fontSize: 20, fontWeight: 900, marginBottom: 4 }}>{livreurNom || 'Coursier'}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, margin: '16px 0', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 600 }}>DE</div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{livraison.ville_ramassage}</div>
          </div>
          <div style={{ color: 'var(--vert)', fontSize: 18, fontWeight: 900, alignSelf: 'center' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 600 }}>À</div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{livraison.ville_livraison}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontSize: 12 }}>
          <div>
            <div style={{ color: 'var(--text3)', fontSize: 10 }}>PRIX</div>
            <div style={{ color: 'var(--or)', fontWeight: 800, fontSize: 14 }}>{livraison.prix_estime?.toLocaleString() || '—'} FCFA</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text3)', fontSize: 10 }}>STATUT</div>
            <div style={{ color: 'var(--vert)', fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>{livraison.statut?.replace('_', ' ')}</div>
          </div>
        </div>

        {livraison.qr_token && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 16,
            marginTop: 16,
            display: 'inline-block',
          }}>
            <QRCodeSVG
              value={`KONAB_DELIVER:${livraison.qr_token}`}
              size={160}
              level="H"
              includeMargin={false}
              bgColor="white"
              fgColor="#0a0a0a"
            />
          </div>
        )}

        {livraison.qr_token && (
          <div style={{
            marginTop: 12,
            padding: '8px 16px',
            background: 'rgba(57,211,83,0.1)',
            borderRadius: 8,
            display: 'inline-block',
          }}>
            <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>CODE DE VALIDATION</div>
            <div style={{ color: 'var(--vert)', fontSize: 18, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 3 }}>{livraison.qr_token}</div>
          </div>
        )}

        <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 16, lineHeight: 1.5 }}>
          Présentez ce code QR au destinataire pour valider la livraison
        </div>
      </div>
    </motion.div>
  );
}

export function QRScannerModal({ onClose, onValidated }) {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner() {
    try {
      const scanner = new Html5Qrcode('qr-scanner-container');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {}
      );
    } catch (err) {
      setError('Caméra non disponible. Entrez le code manuellement.');
    }
  }

  function stopScanner() {
    try {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
        }).catch(() => {});
      }
    } catch (_) {}
  }

  async function onScanSuccess(decodedText) {
    stopScanner();
    const token = decodedText.replace('KONAB_DELIVER:', '');
    await validateToken(token);
  }

  async function validateToken(token) {
    setValidating(true);
    setError('');

    const { data: livraison } = await supabase.from('livraisons')
      .select('*, livreur:livreurs(total_livraisons)')
      .eq('qr_token', token.toUpperCase())
      .single();

    if (!livraison) {
      setError('Code invalide. Aucune livraison trouvée.');
      setValidating(false);
      return;
    }

    if (livraison.statut === 'livree') {
      setError('Cette livraison est déjà validée.');
      setValidating(false);
      return;
    }

    if (livraison.statut !== 'en_cours' && livraison.statut !== 'acceptee') {
      setError('Cette livraison n\'est pas prête pour la validation.');
      setValidating(false);
      return;
    }

    const { error: updateErr } = await supabase.from('livraisons').update({
      statut: 'livree',
      validated_at: new Date().toISOString(),
      validated_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq('id', livraison.id);

    if (updateErr) {
      setError('Erreur lors de la validation.');
      setValidating(false);
      return;
    }

    if (livraison.livreur_id) {
      const currentTotal = livraison.livreur?.total_livraisons || 0;
      await supabase.from('livreurs').update({
        total_livraisons: currentTotal + 1,
      }).eq('id', livraison.livreur_id);
    }

    if (livraison.acheteur_id) {
      try {
        await supabase.rpc('creer_notification', {
          p_user_id: livraison.acheteur_id,
          p_type: 'livraison',
          p_title: 'Livraison validée',
          p_body: `Votre livraison ${token} a été validée avec succès !`,
          p_data: JSON.stringify({ livraison_id: livraison.id, statut: 'livree' })
        });
      } catch (_) {}
    }

    if (livraison.livreur_id) {
      try {
        await supabase.rpc('creer_notification', {
          p_user_id: livraison.livreur_id,
          p_type: 'livraison',
          p_title: 'Livraison terminée',
          p_body: `Livraison ${token} confirmée par le destinataire.`,
          p_data: JSON.stringify({ livraison_id: livraison.id, statut: 'livree' })
        });
      } catch (_) {}
    }

    setResult(livraison);
    setValidating(false);
    if (onValidated) onValidated(livraison);
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 700 }}>
      <motion.div className="modal" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ maxWidth: 420, padding: 0, overflow: 'hidden' }}>

        <div style={{
          background: 'linear-gradient(135deg, var(--vert) 0%, var(--vert-dark) 100%)',
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={20} color="white" />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>Scanner le QR Code</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} color="white" />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {result ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '20px 0' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                <CheckCircle size={64} color="var(--vert)" />
              </motion.div>
              <h3 style={{ color: 'white', marginTop: 16, marginBottom: 8 }}>Livraison validée !</h3>
              <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 6 }}>
                {result.ville_ramassage} → {result.ville_livraison}
              </p>
              <p style={{ color: 'var(--vert)', fontSize: 13, fontWeight: 700 }}>
                Code : {result.qr_token}
              </p>
              <motion.button className="btn btn-primary btn-full" style={{ marginTop: 20 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={onClose}>
                Fermer
              </motion.button>
            </motion.div>
          ) : (
            <>
              <div id="qr-scanner-container" ref={containerRef}
                style={{ width: '100%', minHeight: 250, borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: '#000' }} />

              {error && (
                <div style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 12 }}>Ou entrez le code manuellement :</div>
                <ManualCodeInput onSubmit={validateToken} disabled={validating} />
              </div>

              {validating && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <div className="spinner" />
                  <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 8 }}>Validation en cours...</div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ManualCodeInput({ onSubmit, disabled }) {
  const [code, setCode] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (code.trim().length >= 4) {
      onSubmit(code.trim().toUpperCase());
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="KBL-XXXXXXXX"
        disabled={disabled}
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          borderRadius: 10,
          padding: '10px 16px',
          color: 'white',
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'monospace',
          letterSpacing: 2,
          textAlign: 'center',
          width: 180,
          outline: 'none',
        }}
      />
      <motion.button type="submit" className="btn btn-primary btn-sm"
        disabled={disabled || code.trim().length < 4}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        style={{ borderRadius: 10 }}>
        <CheckCircle size={16} />
      </motion.button>
    </form>
  );
}
