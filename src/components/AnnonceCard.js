import { TYPE_ANNONCE } from '../supabase';

const CHIP_CLASS = {
  offre: 'chip-offre', emploi: 'chip-emploi',
  formation: 'chip-formation', article: 'chip-article', recherche: 'chip-recherche'
};

export function AnnonceCard({ annonce, onInterest, onEdit, onDelete, isOwner }) {
  const typeInfo = TYPE_ANNONCE.find(t => t.value === annonce.type) || TYPE_ANNONCE[0];

  function formatPrix(prix) {
    if (!prix && prix !== 0) return null;
    if (prix === 0) return 'Gratuit / Négociable';
    return new Intl.NumberFormat('fr-FR').format(prix) + ' FCFA';
  }

  function handleWhatsApp() {
    const actionLabel = annonce.type === 'article' ? 'acheter' : 'obtenir plus d\'informations sur';
    const msg = `Bonjour ! Je voudrais ${actionLabel} votre annonce "${annonce.titre}" publiée sur Konab Marcket. Pouvez-vous me donner plus de détails ?`;
    const phone = (annonce.whatsapp || '').replace(/[^0-9]/g, '');
    if (!phone) { alert('Numéro WhatsApp non disponible'); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    if (onInterest) onInterest(annonce.id);
  }

  const prix = formatPrix(annonce.prix);

  return (
    <div className="annonce-card">
      {annonce.profiles?.certifie && <div className="badge-certifie">⭐ Certifié</div>}

      <div className="card-img-wrap">
        {annonce.affiche_url
          ? <img src={annonce.affiche_url} alt={annonce.titre} loading="lazy" />
          : <span style={{ userSelect: 'none' }}>{typeInfo.icon}</span>
        }
        {annonce.affiche_url && <div className="card-img-overlay" />}
      </div>

      <div className="card-body">
        <span className={`type-chip ${CHIP_CLASS[annonce.type] || 'chip-offre'}`}>
          {typeInfo.icon} {typeInfo.label}
        </span>

        <div className="card-title">{annonce.titre}</div>
        <div className="card-desc">{annonce.description}</div>

        {prix && <div className="card-prix-big">{prix}</div>}

        <div className="card-meta-row" style={{ marginTop: 'auto', paddingTop: 6 }}>
          {annonce.secteur && <span>🏢 {annonce.secteur}</span>}
          {annonce.ville && <><span className="card-meta-dot"/><span>📍 {annonce.ville}</span></>}
          {annonce.date_fin && (
            <><span className="card-meta-dot"/><span>📅 {new Date(annonce.date_fin).toLocaleDateString('fr-FR')}</span></>
          )}
        </div>

        {annonce.profiles && (
          <div className="card-meta-row" style={{ marginTop: 6 }}>
            <span>👤 {annonce.profiles.entreprise_nom || annonce.profiles.nom || 'Prestataire'}</span>
            {annonce.vues > 0 && <><span className="card-meta-dot"/><span>👁 {annonce.vues}</span></>}
          </div>
        )}
      </div>

      <div className="card-footer-line">
        {!isOwner ? (
          <button className="btn btn-whatsapp btn-sm" style={{ flex: 1, borderRadius: 'var(--radius-sm)', justifyContent: 'center' }} onClick={handleWhatsApp}>
            💬 {annonce.type === 'article' ? 'Acheter' : 'Intéressé(e)'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-sm)' }} onClick={() => onEdit && onEdit(annonce)}>✏️ Modifier</button>
            <button className="btn btn-sm" style={{ background: '#FFEBEE', color: 'var(--rouge)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }} onClick={() => onDelete && onDelete(annonce.id)}>🗑️</button>
          </div>
        )}
      </div>
    </div>
  );
}
