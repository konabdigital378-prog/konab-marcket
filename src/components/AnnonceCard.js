import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, MapPin, Eye, Star, Heart, MessageCircle, Navigation, Zap } from 'lucide-react';
import { supabase, TYPE_ANNONCE, haversine } from '../supabase';
import { useAuth } from '../hooks/useAuth';

const TYPE_CLASS = {
  offre: 'type-offre', emploi: 'type-emploi',
  formation: 'type-formation', article: 'type-article', recherche: 'type-recherche'
};

export function AnnonceCard({ annonce, onInterest, onEdit, onDelete, isOwner, onClick, showFavoriBtn, userCoords }) {
  const { user } = useAuth();
  const [favori, setFavori] = useState(false);
  const typeInfo = TYPE_ANNONCE.find(t => t.value === annonce.type) || TYPE_ANNONCE[0];

  const distance = useMemo(() => {
    if (!userCoords && !annonce.latitude) return null;
    const lat = annonce.latitude;
    const lng = annonce.longitude;
    if (!lat || !lng) return null;
    if (userCoords) {
      return haversine(userCoords.lat, userCoords.lng, lat, lng);
    }
    return null;
  }, [userCoords, annonce.latitude, annonce.longitude]);

  const promoBadge = useMemo(() => {
    if (!annonce.prix || annonce.prix === 0) return null;
    if (annonce.vues > 50) return { text: '🔥 Populaire', color: 'var(--orange)' };
    if (annonce.profiles?.certifie) return { text: '⭐ Certifié', color: 'var(--vert)' };
    return null;
  }, [annonce]);

  useEffect(() => {
    if (!user || isOwner) return;
    supabase.from('favoris').select('id').eq('user_id', user.id).eq('annonce_id', annonce.id).single()
      .then(({ data }) => setFavori(!!data));
  }, [user, annonce.id, isOwner]);

  async function toggleFavori(e) {
    e.stopPropagation();
    if (!user) return;
    if (favori) {
      await supabase.from('favoris').delete().eq('user_id', user.id).eq('annonce_id', annonce.id);
      setFavori(false);
    } else {
      await supabase.from('favoris').insert({ user_id: user.id, annonce_id: annonce.id });
      setFavori(true);
    }
  }

  function formatPrix(prix) {
    if (!prix && prix !== 0) return null;
    if (prix === 0) return 'Gratuit';
    return new Intl.NumberFormat('fr-FR').format(prix) + ' FCFA';
  }

  function handleWhatsApp(e) {
    e.stopPropagation();
    const actionLabel = annonce.type === 'article' ? 'acheter' : 'obtenir plus d\'informations sur';
    const msg = `Bonjour ! Je voudrais ${actionLabel} votre annonce "${annonce.titre}" publiée sur Konab Marcket. Pouvez-vous me donner plus de détails ?`;
    const phone = (annonce.whatsapp || '').replace(/[^0-9]/g, '');
    if (!phone) { alert('Numéro WhatsApp non disponible'); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    if (onInterest) onInterest(annonce.id);
  }

  const prix = formatPrix(annonce.prix);
  const initials = (annonce.profiles?.nom || 'U').slice(0, 2).toUpperCase();

  return (
    <motion.div className="product-card"
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      onClick={() => onClick && onClick(annonce.id)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {annonce.profiles?.certifie && (
        <div className="product-card-certified">
          <Star size={10} style={{ display: 'inline', marginRight: 2 }} /> Certifié
        </div>
      )}

      {promoBadge && !annonce.profiles?.certifie && (
        <div className="product-card-badge" style={{ background: 'linear-gradient(135deg, var(--orange), #e06000)' }}>
          {promoBadge.text}
        </div>
      )}

      {showFavoriBtn && user && !isOwner && (
        <motion.button className="product-card-favori"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleFavori}>
          <Heart size={16} fill={favori ? 'var(--danger)' : 'none'} color={favori ? 'var(--danger)' : 'rgba(255,255,255,0.7)'} />
        </motion.button>
      )}

      <div className="product-card-img">
        {annonce.affiche_url
          ? <img src={annonce.affiche_url} alt={annonce.titre} loading="lazy" />
          : <ShoppingBag size={48} style={{ color: 'rgba(255,255,255,0.15)' }} />
        }
        {annonce.affiche_url && <div className="product-card-img-overlay" />}
        {distance !== null && distance <= 50 && (
          <div className="badge badge-success" style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 2, fontSize: 10 }}>
            <Navigation size={10} style={{ display: 'inline' }} /> {distance} km
          </div>
        )}
      </div>

      <div className="product-card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span className={`product-card-type ${TYPE_CLASS[annonce.type] || 'type-offre'}`}>
            {typeInfo.icon} {typeInfo.label}
          </span>
          {annonce.prix > 0 && annonce.prix < 10000 && (
            <span className="badge badge-warning" style={{ fontSize: 9, padding: '2px 6px' }}>
              <Zap size={10} style={{ display: 'inline' }} /> Petit prix
            </span>
          )}
        </div>

        <div className="product-card-title">{annonce.titre}</div>
        <div className="product-card-desc">{annonce.description}</div>

        {prix && <div className="product-card-price">{prix}</div>}

        <div className="product-card-meta" style={{ marginTop: 'auto', paddingTop: 6 }}>
          <span><MapPin size={11} style={{ display: 'inline' }} /> {annonce.ville || 'Non précisé'}</span>
          {distance !== null && (
            <><span className="product-card-meta-dot" />
              <span style={{ color: distance <= 10 ? 'var(--vert)' : 'var(--text2)' }}>
                <Navigation size={11} style={{ display: 'inline' }} /> {distance} km
              </span>
            </>
          )}
          {annonce.date_fin && (
            <><span className="product-card-meta-dot" /><span>📅 {new Date(annonce.date_fin).toLocaleDateString('fr-FR')}</span></>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text3)' }}>
            <Eye size={11} /> {annonce.vues || 0}
          </div>
        </div>
      </div>

      <div className="product-card-footer">
        {!isOwner ? (
          <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="product-card-vendor">
              <div className="product-card-vendor-avatar">{initials}</div>
              <span>{annonce.profiles?.entreprise_nom || annonce.profiles?.nom || 'Prestataire'}</span>
              {annonce.profiles?.certifie && <Star size={11} style={{ color: 'var(--vert)' }} />}
            </div>
            <motion.button className="btn btn-primary btn-sm"
              style={{ borderRadius: 'var(--radius-sm)' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleWhatsApp}>
              <MessageCircle size={14} style={{ marginRight: 4 }} />
              {annonce.type === 'article' ? 'Acheter' : 'Intéressé(e)'}
            </motion.button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <motion.button className="btn btn-ghost btn-sm"
              style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); onEdit && onEdit(annonce); }}>Modifier</motion.button>
            <motion.button className="btn btn-sm"
              style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '7px 14px' }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); onDelete && onDelete(annonce.id); }}>Supprimer</motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}