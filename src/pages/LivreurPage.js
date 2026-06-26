import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bike, Truck, MapPin, Package, CheckCircle, XCircle, Clock, DollarSign, Star, Phone, User, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonCards } from '../components/Skeleton';

const TYPE_VEHICULES = [
  { value: 'moto', label: 'Moto / Scooter', icon: '🏍️' },
  { value: 'velo', label: 'Vélo', icon: '🚲' },
  { value: 'voiture', label: 'Voiture', icon: '🚗' },
  { value: 'camion', label: 'Camion', icon: '🚛' },
  { value: 'pied', label: 'À pied', icon: '🚶' },
];

const STATUT_LIVRAISON = {
  en_attente: { label: 'En attente', color: 'var(--or)', icon: <Clock size={14} /> },
  acceptee: { label: 'Acceptée', color: 'var(--vert)', icon: <CheckCircle size={14} /> },
  en_cours: { label: 'En cours', color: '#60EFFF', icon: <Truck size={14} /> },
  livree: { label: 'Livrée', color: 'var(--vert)', icon: <CheckCircle size={14} /> },
  annulee: { label: 'Annulée', color: 'var(--danger)', icon: <XCircle size={14} /> },
};

function LivreurCard({ livreur, onClick }) {
  return (
    <motion.div className="livreur-card" whileHover={{ y: -3 }} onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="livreur-card-header">
        <div className="livreur-avatar">{(livreur.nom || 'L').slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="livreur-name">{livreur.nom}</div>
          <div className="livreur-type">
            {TYPE_VEHICULES.find(v => v.value === livreur.type_vehicule)?.icon} {TYPE_VEHICULES.find(v => v.value === livreur.type_vehicule)?.label}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div className="livreur-note">
            <Star size={12} fill="var(--or)" color="var(--or)" /> {livreur.note_moyenne?.toFixed(1)}
          </div>
          <div className="livreur-livraisons">{livreur.total_livraisons} livr.</div>
        </div>
      </div>
      <div className="livreur-card-body">
        <span><MapPin size={12} /> {livreur.zone_couverture || 'Toute la ville'}</span>
        <span><DollarSign size={12} /> {livreur.tarif_base?.toLocaleString()} FCFA base</span>
        {livreur.disponible && <span className="badge badge-success">Disponible</span>}
      </div>
    </motion.div>
  );
}

function RequestDeliveryModal({ onClose, annonceId, vendeurNom, vendeurTel }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    adresse_ramassage: '', ville_ramassage: 'Ouagadougou',
    adresse_livraison: '', ville_livraison: 'Ouagadougou',
    contact_expediteur: user?.email || '',
    contact_destinataire: '',
    description_colis: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('livraisons').insert({
      annonce_id: annonceId || null,
      acheteur_id: user.id,
      adresse_ramassage: form.adresse_ramassage,
      adresse_livraison: form.adresse_livraison,
      ville_ramassage: form.ville_ramassage,
      ville_livraison: form.ville_livraison,
      contact_expediteur: form.contact_expediteur,
      contact_destinataire: form.contact_destinataire,
      description_colis: form.description_colis,
      prix_estime: 2000,
    });
    setSaving(false);
    if (!error) onClose(true);
  }

  return (
    <div className="modal-overlay" onClick={() => onClose()} style={{ zIndex: 600 }}>
      <motion.div className="modal" onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ maxWidth: 500 }}
      >
        <div className="modal-header">
          <h3><Truck size={18} style={{ marginRight: 8, display: 'inline' }} /> Demander une livraison</h3>
          <button className="modal-close" onClick={() => onClose()}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Adresse de ramassage</label>
              <input className="form-control" required value={form.adresse_ramassage}
                onChange={e => setForm(f => ({ ...f, adresse_ramassage: e.target.value }))}
                placeholder="Adresse où récupérer le colis" />
            </div>
            <div className="form-group">
              <label className="form-label">Ville de ramassage</label>
              <select className="form-control" value={form.ville_ramassage}
                onChange={e => setForm(f => ({ ...f, ville_ramassage: e.target.value }))}>
                {['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Kaya'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Adresse de livraison</label>
              <input className="form-control" required value={form.adresse_livraison}
                onChange={e => setForm(f => ({ ...f, adresse_livraison: e.target.value }))}
                placeholder="Adresse de destination" />
            </div>
            <div className="form-group">
              <label className="form-label">Ville de livraison</label>
              <select className="form-control" value={form.ville_livraison}
                onChange={e => setForm(f => ({ ...f, ville_livraison: e.target.value }))}>
                {['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Kaya'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Contact expéditeur</label>
                <input className="form-control" required value={form.contact_expediteur}
                  onChange={e => setForm(f => ({ ...f, contact_expediteur: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact destinataire</label>
                <input className="form-control" required value={form.contact_destinataire}
                  onChange={e => setForm(f => ({ ...f, contact_destinataire: e.target.value }))}
                  placeholder="Téléphone du destinataire" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description du colis</label>
              <textarea className="form-control" rows={2} value={form.description_colis}
                onChange={e => setForm(f => ({ ...f, description_colis: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <motion.button type="button" className="btn btn-ghost" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onClose()}>Annuler</motion.button>
            <motion.button type="submit" className="btn btn-primary" disabled={saving}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {saving ? 'Envoi...' : 'Demander livraison'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function LivreurPage({ onBack }) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('disponibles');
  const [livreurs, setLivreurs] = useState([]);
  const [monProfil, setMonProfil] = useState(null);
  const [mesLivraisons, setMesLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({ type_vehicule: 'moto', zone_couverture: '', tarif_base: 1000, tarif_par_km: 200 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    const { data: l } = await supabase.from('livreurs')
      .select('*, profiles:profiles!livreurs_id_fkey(nom, telephone, ville, entreprise_nom)')
      .order('note_moyenne', { ascending: false });
    if (l) setLivreurs(l);

    if (user) {
      const { data: mp } = await supabase.from('livreurs').select('*').eq('id', user.id).single();
      if (mp) setMonProfil(mp);

      const { data: livs } = await supabase.from('livraisons')
        .select('*, annonces(titre)')
        .or(`acheteur_id.eq.${user.id},livreur_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (livs) setMesLivraisons(livs);
    }
    setLoading(false);
  }

  async function devenirLivreur(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('livreurs').insert({
      id: user.id,
      type_vehicule: form.type_vehicule,
      zone_couverture: form.zone_couverture,
      tarif_base: parseInt(form.tarif_base),
      tarif_par_km: parseInt(form.tarif_par_km),
    });
    setSaving(false);
    if (!error) {
      loadData();
    }
  }

  async function toggleDisponible() {
    const { error } = await supabase.from('livreurs')
      .update({ disponible: !monProfil.disponible }).eq('id', user.id);
    if (!error) setMonProfil(p => ({ ...p, disponible: !p.disponible }));
  }

  async function updateStatut(livraisonId, statut) {
    await supabase.from('livraisons').update({ statut, updated_at: new Date().toISOString() }).eq('id', livraisonId);
    if (statut === 'livree' && monProfil) {
      await supabase.from('livreurs').update({ total_livraisons: (monProfil.total_livraisons || 0) + 1 }).eq('id', user.id);
    }
    loadData();
  }

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <Truck size={60} className="icon" />
          <h3>Connectez-vous pour accéder aux livreurs</h3>
          <p>Créez un compte pour demander une livraison ou devenir coursier.</p>
        </div>
      </div>
    );
  }

  const mesLivs = mesLivraisons.filter(l => l.livreur_id === user?.id);
  const mesCmd = mesLivraisons.filter(l => l.acheteur_id === user?.id);

  return (
    <div className="page">
      <motion.button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
        <ArrowLeft size={18} /> Retour
      </motion.button>

      <div className="profile-banner" style={{ marginBottom: 24 }}>
        <div className="profile-avatar">
          <Truck size={30} />
        </div>
        <div className="profile-info">
          <div className="profile-name">Livraison Konab Marcket</div>
          <div className="profile-email">Faites livrer vos achats ou devenez coursier</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'disponibles' ? 'active' : ''}`} onClick={() => setTab('disponibles')}>
          <Bike size={16} /> Livreurs disponibles
        </button>
        <button className={`tab-btn ${tab === 'demander' ? 'active' : ''}`} onClick={() => setTab('demander')}>
          <Package size={16} /> Demander
        </button>
        <button className={`tab-btn ${tab === 'mes_livraisons' ? 'active' : ''}`} onClick={() => setTab('mes_livraisons')}>
          <Truck size={16} /> Mes livraisons
        </button>
        {user && (
          <button className={`tab-btn ${tab === 'devenir' ? 'active' : ''}`} onClick={() => setTab('devenir')}>
            <User size={16} /> Devenir coursier
          </button>
        )}
      </div>

      {tab === 'disponibles' && (
        <div>
          <div className="section-header">
            <div className="section-title" style={{ marginBottom: 20 }}>
              <div className="section-title-bar" /> <Bike size={20} /> Coursiers disponibles
            </div>
          </div>
          {loading ? <SkeletonCards count={3} />
          : livreurs.length === 0 ? (
            <div className="empty-state">
              <Bike size={60} className="icon" />
              <h3>Aucun coursier disponible</h3>
              <p>Soyez le premier à devenir coursier sur Konab Marcket !</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {livreurs.filter(l => l.disponible).map(l => (
                <LivreurCard key={l.id} livreur={{ ...l, nom: l.profiles?.nom || l.profiles?.entreprise_nom || 'Coursier' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'demander' && (
        <div>
          <div className="card-surface" style={{ textAlign: 'center', padding: 40 }}>
            <Package size={48} style={{ color: 'var(--vert)', marginBottom: 16 }} />
            <h3 style={{ color: 'white', marginBottom: 8, fontSize: 18 }}>Besoin d'une livraison ?</h3>
            <p style={{ color: 'var(--text2)', marginBottom: 20 }}>Remplissez le formulaire pour qu'un coursier prenne en charge votre colis.</p>
            <motion.button className="btn btn-primary btn-lg"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowRequest(true)}>
              <Plus size={18} /> Nouvelle demande de livraison
            </motion.button>
          </div>
          {mesCmd.length > 0 && (
            <div>
              <div className="section-title" style={{ margin: '24px 0 16px' }}>
                <div className="section-title-bar" /> Mes demandes ({mesCmd.length})
              </div>
              {mesCmd.map(l => (
                <motion.div key={l.id} className="livraison-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="livraison-card-top">
                    <span className="livraison-annonce">{l.annonces?.titre || 'Livraison'}</span>
                    <span className="livraison-statut" style={{ color: STATUT_LIVRAISON[l.statut]?.color }}>
                      {STATUT_LIVRAISON[l.statut]?.icon} {STATUT_LIVRAISON[l.statut]?.label}
                    </span>
                  </div>
                  <div className="livraison-card-body">
                    <span><MapPin size={12} /> {l.ville_ramassage} → {l.ville_livraison}</span>
                    <span><DollarSign size={12} /> {l.prix_estimo?.toLocaleString() || '—'} FCFA</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'mes_livraisons' && (
        <div>
          <div className="section-header">
            <div className="section-title" style={{ marginBottom: 20 }}>
              <div className="section-title-bar" /> <Truck size={20} /> Livraisons ({mesLivs.length})
            </div>
            {monProfil && (
              <motion.button className={`btn ${monProfil.disponible ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={toggleDisponible}>
                {monProfil.disponible ? '🟢 Disponible' : '🔴 Indisponible'}
              </motion.button>
            )}
          </div>
          {mesLivs.length === 0 ? (
            <div className="empty-state">
              <Truck size={60} className="icon" />
              <h3>Aucune livraison</h3>
              <p>Les demandes de livraison apparaîtront ici.</p>
            </div>
          ) : (
            mesLivs.map(l => (
              <motion.div key={l.id} className="livraison-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="livraison-card-top">
                  <span className="livraison-annonce">{l.annonces?.titre || 'Livraison'}</span>
                  <span className="livraison-statut" style={{ color: STATUT_LIVRAISON[l.statut]?.color }}>
                    {STATUT_LIVRAISON[l.statut]?.icon} {STATUT_LIVRAISON[l.statut]?.label}
                  </span>
                </div>
                <div className="livraison-card-body">
                  <span><MapPin size={12} /> {l.ville_ramassage} → {l.ville_livraison}</span>
                  <span><Phone size={12} /> {l.contact_destinataire}</span>
                </div>
                {l.statut === 'en_attente' && (
                  <div className="livraison-card-actions">
                    <motion.button className="btn btn-primary btn-sm"
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => updateStatut(l.id, 'acceptee')}>
                      ✅ Accepter
                    </motion.button>
                    <motion.button className="btn btn-sm"
                      style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)' }}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => updateStatut(l.id, 'annulee')}>
                      Refuser
                    </motion.button>
                  </div>
                )}
                {l.statut === 'acceptee' && (
                  <div className="livraison-card-actions">
                    <motion.button className="btn btn-primary btn-sm"
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => updateStatut(l.id, 'en_cours')}>
                      🚚 En cours de livraison
                    </motion.button>
                  </div>
                )}
                {l.statut === 'en_cours' && (
                  <div className="livraison-card-actions">
                    <motion.button className="btn btn-primary btn-sm"
                      style={{ background: 'linear-gradient(135deg, var(--vert), var(--vert-dark))' }}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => updateStatut(l.id, 'livree')}>
                      ✅ Marquer comme livrée
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {tab === 'devenir' && (
        <div>
          {monProfil ? (
            <div>
              <div className="profile-banner" style={{ marginBottom: 20 }}>
                <div className="profile-avatar"><Bike size={28} /></div>
                <div className="profile-info">
                  <div className="profile-name">Coursier • {profile?.nom}</div>
                  <div className="profile-badges" style={{ marginTop: 8 }}>
                    <span className={`badge ${monProfil.disponible ? 'badge-success' : 'badge-gray'}`}>
                      {monProfil.disponible ? 'Disponible' : 'Indisponible'}
                    </span>
                    <span className="badge badge-info">
                      {TYPE_VEHICULES.find(v => v.value === monProfil.type_vehicule)?.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <Package size={20} style={{ color: 'var(--vert)', margin: '0 auto 8px' }} />
                  <div className="stat-num vert">{monProfil.total_livraisons || 0}</div>
                  <div className="stat-label">Livraisons</div>
                </div>
                <div className="stat-card">
                  <Star size={20} style={{ color: 'var(--or)', margin: '0 auto 8px' }} />
                  <div className="stat-num or">{monProfil.note_moyenne?.toFixed(1)}</div>
                  <div className="stat-label">Note</div>
                </div>
                <div className="stat-card">
                  <DollarSign size={20} style={{ color: 'white', margin: '0 auto 8px' }} />
                  <div className="stat-num blanc">{monProfil.tarif_base?.toLocaleString()}</div>
                  <div className="stat-label">Tarif base (FCFA)</div>
                </div>
              </div>
              <motion.button className={`btn btn-lg btn-full ${monProfil.disponible ? 'btn-ghost' : 'btn-primary'}`}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={toggleDisponible}>
                {monProfil.disponible ? '🔴 Devenir indisponible' : '🟢 Devenir disponible'}
              </motion.button>
            </div>
          ) : (
            <motion.div className="card-surface" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-surface-title"><Bike size={20} /> Devenir coursier Konab Marcket</div>
              <p style={{ color: 'var(--text2)', marginBottom: 24, lineHeight: 1.7 }}>
                Proposez vos services de livraison aux milliers d'utilisateurs de Konab Marcket. 
                Fixez vos tarifs, votre zone et votre type de véhicule.
              </p>
              <form onSubmit={devenirLivreur}>
                <div className="form-group">
                  <label className="form-label">Type de véhicule</label>
                  <select className="form-control" value={form.type_vehicule}
                    onChange={e => setForm(f => ({ ...f, type_vehicule: e.target.value }))}>
                    {TYPE_VEHICULES.map(v => <option key={v.value} value={v.value}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Zone de couverture</label>
                  <input className="form-control" value={form.zone_couverture}
                    onChange={e => setForm(f => ({ ...f, zone_couverture: e.target.value }))}
                    placeholder="Ex: Ouagadougou, Bobo, Koudougou" />
                </div>
                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Tarif de base (FCFA)</label>
                    <input className="form-control" type="number" value={form.tarif_base}
                      onChange={e => setForm(f => ({ ...f, tarif_base: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tarif par km (FCFA)</label>
                    <input className="form-control" type="number" value={form.tarif_par_km}
                      onChange={e => setForm(f => ({ ...f, tarif_par_km: e.target.value }))} />
                  </div>
                </div>
                <motion.button type="submit" className="btn btn-primary btn-full" disabled={saving}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  {saving ? 'Enregistrement...' : 'Devenir coursier'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showRequest && (
          <RequestDeliveryModal
            onClose={(saved) => { setShowRequest(false); if (saved) loadData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
