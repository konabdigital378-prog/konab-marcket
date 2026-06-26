import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Eye, Calendar, Heart, Share2, MessageCircle, ShoppingBag, Star, Store, ChevronRight, Truck, Flag, Gavel, X, CheckCircle } from 'lucide-react';
import { supabase, TYPE_ANNONCE } from '../supabase';
import { AnnonceCard } from '../components/AnnonceCard';
import { useAuth } from '../hooks/useAuth';

const TYPE_CLASS = {
  offre: 'type-offre', emploi: 'type-emploi',
  formation: 'type-formation', article: 'type-article', recherche: 'type-recherche'
};

export default function AnnonceDetailPage({ annonceId, onBack, onShowAuth, onStartChat, onShowLivraison, onShowSignalement }) {
  const [annonce, setAnnonce] = useState(null);
  const [similaires, setSimilaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favori, setFavori] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMsg, setOfferMsg] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [offerError, setOfferError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from('annonces')
        .select('*, profiles(*)')
        .eq('id', annonceId)
        .single();
      if (!error && data) {
        setAnnonce(data);
        try { await supabase.rpc('increment_vues', { annonce_id: annonceId }); } catch (_) {}
        const { data: sim } = await supabase.from('annonces')
          .select('*, profiles(nom, entreprise_nom, certifie, abonnement)')
          .eq('actif', true).eq('secteur', data.secteur)
          .neq('id', annonceId)
          .order('created_at', { ascending: false }).limit(4);
        if (sim) setSimilaires(sim);
      }
      setLoading(false);
    }
    load();
  }, [annonceId]);

  useEffect(() => {
    if (!user || !annonceId) return;
    supabase.from('favoris').select('id').eq('user_id', user.id).eq('annonce_id', annonceId).single()
      .then(({ data }) => setFavori(!!data));
  }, [user, annonceId]);

  async function toggleFavori() {
    if (!user) { onShowAuth(); return; }
    if (favori) {
      await supabase.from('favoris').delete().eq('user_id', user.id).eq('annonce_id', annonceId);
      setFavori(false);
    } else {
      await supabase.from('favoris').insert({ user_id: user.id, annonce_id: annonceId });
      setFavori(true);
    }
  }

  function handleWhatsApp() {
    const actionLabel = annonce.type === 'article' ? 'acheter' : 'obtenir plus d\'informations sur';
    const msg = `Bonjour ! Je voudrais ${actionLabel} votre annonce "${annonce.titre}" publiée sur Konab Marcket.`;
    const phone = (annonce.whatsapp || '').replace(/[^0-9]/g, '');
    if (!phone) { alert('WhatsApp non disponible'); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function handleShare() {
    const url = window.location.href;
    const msg = `Découvrez "${annonce.titre}" sur Konab Marcket !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg + ' ' + url)}`, '_blank');
  }

  function handleShareFull() {
    if (navigator.share) {
      navigator.share({ title: annonce.titre, text: `Découvrez "${annonce.titre}" sur Konab Marcket`, url: window.location.href });
    } else {
      handleShare();
    }
  }

  async function handleSendOffer() {
    if (!user) { onShowAuth(); return; }
    if (!offerAmount || parseInt(offerAmount) <= 0) { setOfferError('Montant invalide'); return; }
    setSendingOffer(true);
    setOfferError('');
    const { error } = await supabase.from('offres').insert({
      annonce_id: annonceId,
      acheteur_id: user.id,
      montant: parseInt(offerAmount),
      message: offerMsg,
    });
    if (error) {
      setOfferError(error.message);
    } else {
      try {
        await supabase.rpc('creer_notification', {
          p_user_id: annonce.user_id,
          p_type: 'offre',
          p_title: `Nouvelle offre sur "${annonce.titre}"`,
          p_body: `${(user?.email || 'Quelqu\'un').split('@')[0]} propose ${parseInt(offerAmount).toLocaleString('fr-FR')} FCFA`,
          p_data: JSON.stringify({ annonce_id: annonceId, montant: parseInt(offerAmount) })
        });
      } catch (_) {}
      setOfferSent(true);
    }
    setSendingOffer(false);
  }

  if (loading) {
    return (
      <div className="page">
        <div className="detail-skeleton">
          <div className="skeleton-block" style={{ height: 300, borderRadius: 'var(--radius)' }} />
          <div className="skeleton-block" style={{ height: 24, width: '60%', marginTop: 24 }} />
          <div className="skeleton-block" style={{ height: 16, width: '40%', marginTop: 12 }} />
          <div className="skeleton-block" style={{ height: 100, marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (!annonce) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon"><ShoppingBag size={60} /></div>
          <h3>Annonce introuvable</h3>
          <p>Cette annonce n'existe plus ou a été retirée.</p>
          <motion.button className="btn btn-primary btn-lg" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
            <ArrowLeft size={18} /> Retour aux annonces
          </motion.button>
        </div>
      </div>
    );
  }

  const typeInfo = TYPE_ANNONCE.find(t => t.value === annonce.type) || TYPE_ANNONCE[0];
  const isOwner = user && annonce.user_id === user.id;
  const vendeur = annonce.profiles;

  return (
    <div className="page">
      <motion.button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
        <ArrowLeft size={18} /> Retour
      </motion.button>

      <div className="detail-grid">
        <div className="detail-main">
          <motion.div className="detail-image-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {annonce.affiche_url ? (
              <div className="detail-image-container">
                <img src={annonce.affiche_url} alt={annonce.titre} className="detail-image" />
              </div>
            ) : (
              <div className="detail-image-placeholder">
                <ShoppingBag size={72} style={{ color: 'rgba(255,255,255,0.15)' }} />
              </div>
            )}
          </motion.div>

          <motion.div className="detail-info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="detail-header">
              <span className={`detail-type ${TYPE_CLASS[annonce.type] || 'type-offre'}`}>
                {typeInfo.icon} {typeInfo.label}
              </span>
              {vendeur?.certifie && (
                <span className="verified-badge-large"><Star size={14} /> Vendeur certifié</span>
              )}
            </div>

            <h1 className="detail-title">{annonce.titre}</h1>

            <div className="detail-meta">
              <span><MapPin size={14} /> {annonce.ville || 'Non précisée'}</span>
              <span><Calendar size={14} /> {new Date(annonce.created_at).toLocaleDateString('fr-FR')}</span>
              <span><Eye size={14} /> {annonce.vues || 0} vues</span>
            </div>

            {annonce.prix !== null && annonce.prix !== undefined && (
              <div className="detail-price">
                {annonce.prix === 0 ? 'Gratuit' : new Intl.NumberFormat('fr-FR').format(annonce.prix) + ' FCFA'}
              </div>
            )}

            <div className="detail-section">
              <h3>Description</h3>
              <p>{annonce.description}</p>
            </div>

            <div className="detail-section">
              <h3>Informations</h3>
              <div className="detail-infos-grid">
                <div className="detail-info-item">
                  <span className="detail-info-label">Secteur</span>
                  <span className="detail-info-value">{annonce.secteur}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-info-label">Type</span>
                  <span className="detail-info-value">{typeInfo.label}</span>
                </div>
                {annonce.ville && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">Ville</span>
                    <span className="detail-info-value">{annonce.ville}</span>
                  </div>
                )}
                {annonce.date_fin && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">Date limite</span>
                    <span className="detail-info-value">{new Date(annonce.date_fin).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div className="detail-sidebar"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="detail-actions-card">
            {!isOwner && (
              <>
                <motion.button className="btn btn-primary btn-full btn-lg"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleWhatsApp}
                  style={{ marginBottom: 10 }}
                >
                  <MessageCircle size={20} /> {annonce.type === 'article' ? 'Acheter' : 'Contacter'}
                </motion.button>

                {user && (
                  <motion.button className="btn btn-full btn-lg"
                    style={{ background: 'rgba(57,211,83,0.08)', color: 'var(--vert)', border: '1px solid rgba(57,211,83,0.2)', marginBottom: 10 }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => onStartChat(annonce, vendeur)}
                  >
                    <MessageCircle size={20} /> Envoyer un message
                  </motion.button>
                )}

                <motion.button className="btn btn-full btn-lg"
                  style={{ background: 'rgba(245,183,0,0.08)', color: 'var(--or)', border: '1px solid rgba(245,183,0,0.2)', marginBottom: 10 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={onShowLivraison}
                >
                  <Truck size={20} /> Faire livrer
                </motion.button>

                {user && (
                  <motion.button className="btn btn-full btn-lg"
                    style={{ background: 'rgba(255,71,87,0.06)', color: 'var(--danger)', border: '1px solid rgba(255,71,87,0.15)', marginBottom: 10 }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setShowOffer(true)}
                  >
                    <Gavel size={20} /> Faire une offre
                  </motion.button>
                )}

                <div className="detail-actions-row">
                  <motion.button className="detail-action-btn"
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={toggleFavori}
                    style={{ color: favori ? 'var(--danger)' : 'var(--text2)' }}
                  >
                    <Heart size={18} fill={favori ? 'var(--danger)' : 'none'} />
                    {favori ? 'Favori' : 'Favoris'}
                  </motion.button>
                  <motion.button className="detail-action-btn"
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleShareFull}
                  >
                    <Share2 size={18} /> Partager
                  </motion.button>
                </div>

                <motion.button className="detail-action-btn"
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--text3)', fontSize: 12, gap: 6, marginTop: 4 }}
                  whileHover={{ scale: 1.02, color: 'var(--danger)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => user ? onShowSignalement(annonceId) : onShowAuth()}
                >
                  <Flag size={14} /> Signaler cette annonce
                </motion.button>
              </>
            )}

            <div className="detail-vendeur-card" onClick={() => onBack()}>
              <div className="detail-vendeur-avatar">
                {(vendeur?.nom || 'U').slice(0, 2).toUpperCase()}
                {vendeur?.certifie && (
                  <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--vert)', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>
                    <Star size={8} fill="white" color="white" />
                  </div>
                )}
              </div>
              <div className="detail-vendeur-info">
                <div className="detail-vendeur-name">
                  {vendeur?.entreprise_nom || vendeur?.nom || 'Prestataire'}
                  {vendeur?.certifie && <Star size={12} style={{ color: 'var(--vert)', marginLeft: 4, display: 'inline' }} />}
                </div>
                <div className="detail-vendeur-meta">
                  <Store size={12} /> Voir le profil
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text3)' }} />
            </div>
          </div>
        </motion.div>
      </div>

      {showOffer && !offerSent && (
        <motion.div className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && setShowOffer(false)}
        >
          <motion.div className="modal" style={{ maxWidth: 420 }}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
          >
            <div className="flag-strip" />
            <div className="modal-header">
              <h3><Gavel size={18} style={{ display: 'inline', marginRight: 8 }} /> Faire une offre</h3>
              <motion.button className="modal-close" onClick={() => setShowOffer(false)}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <X size={18} />
              </motion.button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>
                Proposez votre prix pour "<strong style={{ color: 'white' }}>{annonce.titre}</strong>"
              </p>
              {offerError && <div className="alert alert-danger">{offerError}</div>}
              <div className="form-group">
                <label className="form-label">Votre offre</label>
                <div className="offer-input-group">
                  <span>FCFA</span>
                  <input type="number" placeholder="Montant"
                    value={offerAmount}
                    onChange={e => setOfferAmount(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Message (optionnel)</label>
                <textarea className="form-control" placeholder="Expliquez votre offre..."
                  value={offerMsg} onChange={e => setOfferMsg(e.target.value)} rows={2} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button className="btn btn-ghost" style={{ borderRadius: 'var(--radius-sm)' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowOffer(false)} disabled={sendingOffer}>
                  Annuler
                </motion.button>
                <motion.button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
                  disabled={sendingOffer || !offerAmount}
                  whileHover={{ scale: (sendingOffer || !offerAmount) ? 1 : 1.02 }}
                  whileTap={{ scale: (sendingOffer || !offerAmount) ? 1 : 0.98 }}
                  onClick={handleSendOffer}>
                  {sendingOffer ? <><span className="btn-spinner" /> Envoi...</> : 'Envoyer l\'offre'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {offerSent && (
        <motion.div className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && setShowOffer(false)}
        >
          <motion.div className="modal" style={{ maxWidth: 400 }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flag-strip" />
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px' }}>
                  <CheckCircle size={60} style={{ color: 'var(--vert)', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'white' }}>Offre envoyée !</h3>
              <p style={{ color: 'var(--text2)', marginBottom: 20 }}>
                Le vendeur sera notifié de votre proposition.
              </p>
              <motion.button className="btn btn-primary" onClick={() => { setShowOffer(false); setOfferSent(false); }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Fermer
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {similaires.length > 0 && (
        <motion.div className="section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="section-header">
            <div className="section-title">
              <div className="section-title-bar" />
              Annonces similaires dans {annonce.secteur}
            </div>
          </div>
          <div className="cards-grid">
            {similaires.map(a => (
              <AnnonceCard key={a.id} annonce={a} onInterest={() => {}} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

