import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, CheckCircle, XCircle, Truck, DollarSign, Phone, User, Star, QrCode, Camera } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { DeliveryCard, QRScannerModal } from '../components/DeliveryCard';

const STATUTS = [
  { key: 'en_attente', label: 'En attente', desc: 'En attente d\'un coursier', icon: Clock, color: 'var(--or)' },
  { key: 'acceptee', label: 'Acceptée', desc: 'Un coursier a accepté votre demande', icon: CheckCircle, color: 'var(--vert)' },
  { key: 'en_cours', label: 'En cours', desc: 'Le coursier a récupéré le colis', icon: Truck, color: '#60EFFF' },
  { key: 'livree', label: 'Livrée', desc: 'Colis livré avec succès', icon: CheckCircle, color: 'var(--vert)' },
];

const STATUT_INDEX = { en_attente: 0, acceptee: 1, en_cours: 2, livree: 3, annulee: -1 };

export default function LivraisonDetailPage({ livraisonId, onBack }) {
  const { user } = useAuth();
  const [livraison, setLivraison] = useState(null);
  const [livreur, setLivreur] = useState(null);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    loadLivraison();
    const ch = supabase.channel('status-alerts');
    ch.on('broadcast', { event: 'status_update' }, ({ payload }) => {
      if (payload?.livraison_id === livraisonId) loadLivraison();
    });
    ch.subscribe();
    return () => supabase.removeChannel(ch);
  }, [livraisonId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLivraison() {
    const { data } = await supabase.from('livraisons')
      .select('*, annonces(titre, prix)')
      .eq('id', livraisonId)
      .single();
    if (data) {
      setLivraison(data);
      setNote(data.note_livreur || 0);
      setCommentaire(data.commentaire || '');
      if (data.livreur_id) {
        const { data: l } = await supabase.from('livreurs')
          .select('*, profiles:profiles!livreurs_id_fkey(nom, telephone)')
          .eq('id', data.livreur_id).single();
        if (l) setLivreur(l);
      }
    }
  }

  async function submitNote() {
    if (!note || !user) return;
    setSavingNote(true);
    await supabase.from('livraisons').update({
      note_livreur: note,
      commentaire: commentaire,
      updated_at: new Date().toISOString()
    }).eq('id', livraisonId);
    if (livreur) {
      const { data: allNotes } = await supabase.from('livraisons')
        .select('note_livreur').eq('livreur_id', livreur.id).not('note_livreur', 'is', null);
      const avg = allNotes?.length
        ? (allNotes.reduce((s, n) => s + (n.note_livreur || 0), 0) / allNotes.length)
        : note;
      await supabase.from('livreurs').update({ note_moyenne: avg }).eq('id', livreur.id);
    }
    setSavingNote(false);
    loadLivraison();
  }

  if (!livraison) {
    return (
      <div className="page">
        <motion.button className="btn btn-ghost btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
          <ArrowLeft size={18} /> Retour
        </motion.button>
        <div className="empty-state"><Truck size={60} className="icon" /><h3>Chargement...</h3></div>
      </div>
    );
  }

  const currentIdx = STATUT_INDEX[livraison.statut] ?? -1;
  const isAcheteur = user?.id === livraison.acheteur_id;
  const statutInfo = STATUTS.find(s => s.key === livraison.statut);

  function getWhatsAppLink(tel, msg) {
    const phone = (tel || '').replace(/[^0-9]/g, '');
    if (!phone) return null;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="page">
      <motion.button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
        <ArrowLeft size={18} /> Retour
      </motion.button>

      <motion.div className="card-surface" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
              Suivi livraison
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              {livraison.annonces?.titre || 'Livraison'} • {livraison.ville_ramassage} → {livraison.ville_livraison}
            </div>
          </div>
          <span className="livraison-statut" style={{ color: statutInfo?.color, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            {statutInfo?.icon} {statutInfo?.label}
          </span>
        </div>

        <div className="delivery-timeline">
          {STATUTS.map((s, idx) => {
            const isDone = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={s.key} className={`timeline-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                <div className="timeline-dot">
                  <s.icon size={16} />
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">{s.label}</div>
                  <div className="timeline-desc">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {livraison.statut === 'en_cours' && livraison.qr_token && (user?.id === livraison.acheteur_id) && (
        <motion.div style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <DeliveryCard
            livraison={livraison}
            livreurNom={livreur?.profiles?.nom || 'Coursier'}
          />
          <motion.button className="btn btn-primary btn-full" style={{ marginTop: 16 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowScanner(true)}>
            <Camera size={18} /> Scanner le QR pour valider
          </motion.button>
        </motion.div>
      )}

      {livraison.statut === 'en_cours' && livraison.qr_token && (user?.id !== livraison.acheteur_id) && (
        <motion.div style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <DeliveryCard
            livraison={livraison}
            livreurNom={livreur?.profiles?.nom || 'Coursier'}
          />
        </motion.div>
      )}

      {livraison.statut === 'en_cours' && !livraison.qr_token && (
        <motion.div className="card-surface" style={{ marginTop: 20, textAlign: 'center', padding: 24 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <QrCode size={36} style={{ color: 'var(--or)', marginBottom: 10 }} />
          <h3 style={{ color: 'white', marginBottom: 6, fontSize: 15 }}>En cours de livraison</h3>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Le coursier est en route. La carte QR sera générée automatiquement.</p>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <motion.div className="card-surface" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} /> Adresses
          </h3>
          <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8 }}>
            <div><strong style={{ color: 'white' }}>Ramassage :</strong><br />{livraison.adresse_ramassage}</div>
            <div style={{ marginTop: 10 }}><strong style={{ color: 'white' }}>Livraison :</strong><br />{livraison.adresse_livraison}</div>
          </div>
        </motion.div>

        <motion.div className="card-surface" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={16} /> Prix
          </h3>
          <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8 }}>
            <div>Prix estimé : <strong style={{ color: 'white' }}>{livraison.prix_estime?.toLocaleString() || '—'} FCFA</strong></div>
            {livraison.prix_final && <div>Prix final : <strong style={{ color: 'var(--vert)' }}>{livraison.prix_final?.toLocaleString()} FCFA</strong></div>}
            {livraison.description_colis && (
              <div style={{ marginTop: 10 }}>
                <strong style={{ color: 'white' }}>Colis :</strong><br />{livraison.description_colis}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {livreur && (
        <motion.div className="card-surface" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginTop: 20 }}>
          <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} /> Coursier
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="livreur-avatar" style={{ width: 50, height: 50, fontSize: 16 }}>
              {(livreur.profiles?.nom || 'C').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'white' }}>{livreur.profiles?.nom || 'Coursier'}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                <Star size={12} fill="var(--or)" color="var(--or)" style={{ display: 'inline', marginRight: 4 }} />
                {livreur.note_moyenne?.toFixed(1)} • {livreur.total_livraisons} livraisons
              </div>
            </div>
            {livreur.profiles?.telephone && (
              <motion.a href={getWhatsAppLink(livreur.profiles.telephone, `Bonjour ! Je suis au sujet de la livraison ${livraisonId?.slice(0, 8)}...`)} target="_blank"
                className="btn btn-primary btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ borderRadius: 'var(--radius-sm)' }}>
                <Phone size={14} /> Contacter
              </motion.a>
            )}
          </div>
        </motion.div>
      )}

      {livraison.statut === 'en_attente' && (
        <motion.div className="card-surface" style={{ marginTop: 20, textAlign: 'center', padding: 32 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Clock size={40} style={{ color: 'var(--or)', marginBottom: 12 }} />
          <h3 style={{ color: 'white', marginBottom: 6 }}>En attente d'un coursier</h3>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Un coursier va bientôt accepter votre demande. Vous serez notifié.</p>
        </motion.div>
      )}

      {livraison.statut === 'livree' && (
        <motion.div className="card-surface" style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
            <Star size={16} style={{ marginRight: 6 }} /> Noter le coursier
          </h3>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <motion.button key={n} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                style={{
                  background: 'none', border: 'none', fontSize: 28, cursor: 'pointer',
                  color: n <= note ? 'var(--or)' : 'rgba(255,255,255,0.15)', transition: 'var(--transition)'
                }}
                onClick={() => setNote(n)}>
                ★
              </motion.button>
            ))}
          </div>
          <textarea className="form-control" placeholder="Votre commentaire (optionnel)" rows={2}
            value={commentaire} onChange={e => setCommentaire(e.target.value)} style={{ marginBottom: 12 }} />
          <motion.button className="btn btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            disabled={!note || savingNote} onClick={submitNote}>
            {savingNote ? 'Enregistrement...' : '✅ Noter le coursier'}
          </motion.button>
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {livraison.statut === 'en_attente' && isAcheteur && (
          <motion.button className="btn btn-sm"
            style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)' }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={async () => {
              await supabase.from('livraisons').update({ statut: 'annulee', updated_at: new Date().toISOString() }).eq('id', livraisonId);
              loadLivraison();
            }}>
            <XCircle size={14} /> Annuler la demande
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showScanner && (
          <QRScannerModal
            onClose={() => setShowScanner(false)}
            onValidated={() => loadLivraison()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
