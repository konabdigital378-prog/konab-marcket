import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bike, Truck, MapPin, Package, CheckCircle, XCircle, Clock, DollarSign, Star, User, Plus, Calculator, ExternalLink, Search, Crosshair, QrCode, Bell } from 'lucide-react';
import { supabase, haversine, VILLES_COORDS } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { SkeletonCards } from '../components/Skeleton';
import { DeliveryCard } from '../components/DeliveryCard';

function playNewDeliverySound() {
  try {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(660, now);
    osc1.frequency.setValueAtTime(880, now + 0.1);
    osc1.frequency.setValueAtTime(1100, now + 0.2);
    osc2.frequency.setValueAtTime(330, now);
    osc2.frequency.setValueAtTime(440, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc1.start(now);
    osc1.stop(now + 0.5);
    osc2.start(now);
    osc2.stop(now + 0.5);
  } catch (_) {}
}

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

const VILLES = ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Kaya', 'Tenkodogo', 'Fada N\'Gourma', 'Dédougou'];

function calcDistance(ville1, ville2) {
  const dist = {
    'Ouagadougou->Bobo-Dioulasso': 360, 'Ouagadougou->Koudougou': 100,
    'Ouagadougou->Banfora': 440, 'Ouagadougou->Ouahigouya': 185,
    'Ouagadougou->Kaya': 100, 'Bobo-Dioulasso->Ouagadougou': 360,
    'Bobo-Dioulasso->Banfora': 85, 'Bobo-Dioulasso->Koudougou': 270,
    'Koudougou->Ouagadougou': 100, 'Koudougou->Bobo-Dioulasso': 270,
  };
  return dist[`${ville1}->${ville2}`] || dist[`${ville2}->${ville1}`] || 0;
}

function LivreurCard({ livreur, onClick, distanceKm }) {
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
        {distanceKm != null && distanceKm < 9999 && (
          <span className={`badge ${distanceKm <= 50 ? 'badge-success' : 'badge-info'}`}>
            {distanceKm.toFixed(1)} km
          </span>
        )}
        {livreur.disponible && <span className="badge badge-success">Disponible</span>}
      </div>
    </motion.div>
  );
}

function CalculettePrix({ tarifBase, tarifKm, villeRamassage, villeLivraison }) {
  const distance = calcDistance(villeRamassage, villeLivraison);
  const estime = (tarifBase || 1000) + (distance * (tarifKm || 200));
  if (distance === 0 && villeRamassage === villeLivraison) return <span style={{ color: 'var(--text3)', fontSize: 13 }}>Sélectionnez deux villes différentes</span>;
  if (!villeRamassage || !villeLivraison) return null;
  return (
    <div className="calculette-result">
      <div><strong>Distance :</strong> {distance > 0 ? `${distance} km` : 'Même ville'}</div>
      <div><strong>Prix estimé :</strong> <span className="prix-estime">{estime.toLocaleString()} FCFA</span></div>
    </div>
  );
}

function RequestDeliveryModal({ onClose, annonceId, prefillVille }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    adresse_ramassage: '',
    ville_ramassage: prefillVille || 'Ouagadougou',
    adresse_livraison: '',
    ville_livraison: 'Ouagadougou',
    contact_expediteur: user?.email || '',
    contact_destinataire: '',
    description_colis: '',
    photo_url: '',
  });
  const [saving, setSaving] = useState(false);
  const tarifKm = 200;

  function calcEstime() {
    const distance = calcDistance(form.ville_ramassage, form.ville_livraison);
    return distance > 0 ? 1000 + (distance * tarifKm) : 1500;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data: newLiv } = await supabase.from('livraisons').insert({
      annonce_id: annonceId || null,
      acheteur_id: user.id,
      adresse_ramassage: form.adresse_ramassage,
      adresse_livraison: form.adresse_livraison,
      ville_ramassage: form.ville_ramassage,
      ville_livraison: form.ville_livraison,
      contact_expediteur: form.contact_expediteur,
      contact_destinataire: form.contact_destinataire,
      description_colis: form.description_colis,
      prix_estime: calcEstime(),
      photo_url: form.photo_url || null,
    }).select('id').single();

    if (newLiv) {
      try {
        const { data: livreursDispo } = await supabase.from('livreurs')
          .select('id')
          .eq('disponible', true);
        if (livreursDispo && livreursDispo.length > 0) {
          const notifPayload = livreursDispo.map(l => ({
            user_id: l.id,
            type: 'livraison',
            title: '📢 Nouvelle demande de livraison',
            body: `${form.ville_ramassage} → ${form.ville_livraison} • ${calcEstime().toLocaleString()} FCFA`,
            data: { livraison_id: newLiv.id, statut: 'en_attente' },
          }));
          await supabase.from('notifications').insert(notifPayload);
          const { error: rpcErr } = await supabase.rpc('creer_notification', {
            p_user_id: livreursDispo[0]?.id,
            p_type: 'livraison',
            p_title: '📢 Nouvelle demande',
            p_body: `${form.ville_ramassage} → ${form.ville_livraison}`,
            p_data: { livraison_id: newLiv.id, statut: 'en_attente' }
          });
          if (rpcErr) console.log('RPC fallback:', rpcErr.message);
        }
      } catch (e) { console.error('notif erreur:', e); }
    }

    setSaving(false);
    onClose(true);
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
                {VILLES.map(v => <option key={v}>{v}</option>)}
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
                {VILLES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="card-surface" style={{ margin: '0 0 16px', padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--or)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calculator size={14} /> Estimation du prix
              </div>
              <CalculettePrix villeRamassage={form.ville_ramassage} villeLivraison={form.ville_livraison} tarifKm={tarifKm} />
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
                onChange={e => setForm(f => ({ ...f, description_colis: e.target.value }))}
                placeholder="Poids, dimensions, contenu..." />
            </div>
          </div>
          <div className="modal-footer">
            <motion.button type="button" className="btn btn-ghost" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onClose()}>Annuler</motion.button>
            <motion.button type="submit" className="btn btn-primary" disabled={saving}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {saving ? 'Envoi...' : `Demander (${calcEstime().toLocaleString()} FCFA)`}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function LivreurPage({ onBack, onShowLivraisonDetail, initialDelivery }) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState(initialDelivery ? 'mes_livraisons' : 'disponibles');
  const [livreurs, setLivreurs] = useState([]);
  const [monProfil, setMonProfil] = useState(null);
  const [mesLivraisons, setMesLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [prefillVille] = useState('');
  const [form, setForm] = useState({ type_vehicule: 'moto', zone_couverture: '', tarif_base: 1000, tarif_par_km: 200 });
  const [saving, setSaving] = useState(false);
  const [searchVille, setSearchVille] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [newDeliveryAlert, setNewDeliveryAlert] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const seenDeliveryIds = useRef(new Set());
  const alertTimeout = useRef(null);

  const playSoundAndShowAlert = useCallback((livraison) => {
    playNewDeliverySound();
    setNewDeliveryAlert(livraison);
    setNotifCount(c => c + 1);
    if (alertTimeout.current) clearTimeout(alertTimeout.current);
    alertTimeout.current = setTimeout(() => setNewDeliveryAlert(null), 8000);
  }, []);

  useEffect(() => {
    loadData();
    const sub = supabase.channel('livraisons_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'livraisons' }, (payload) => {
        const newLiv = payload.new;
        if (newLiv && newLiv.statut === 'en_attente' && !newLiv.livreur_id && newLiv.acheteur_id !== user?.id) {
          if (!seenDeliveryIds.current.has(newLiv.id)) {
            seenDeliveryIds.current.add(newLiv.id);
            playSoundAndShowAlert(newLiv);
          }
        }
        loadData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'livraisons' }, () => loadData())
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    const q = supabase.from('livreurs')
      .select('*, profiles:profiles!livreurs_id_fkey(nom, telephone, ville, entreprise_nom)')
      .order('note_moyenne', { ascending: false });
    if (searchVille) q.ilike('zone_couverture', `%${searchVille}%`);
    const { data: l } = await q;
    if (l) setLivreurs(l);

    if (user) {
      const { data: mp } = await supabase.from('livreurs').select('*').eq('id', user.id).maybeSingle();
      if (mp) setMonProfil(mp);

      const { data: mesLivs } = await supabase.from('livraisons')
        .select('*, annonces(titre)')
        .or(`acheteur_id.eq.${user.id},livreur_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      let allLivs = mesLivs || [];

      const { data: dispoLivs } = await supabase.from('livraisons')
        .select('*, annonces(titre)')
        .eq('statut', 'en_attente')
        .is('livreur_id', null)
        .order('created_at', { ascending: false });

      if (dispoLivs) {
        const existingIds = new Set(allLivs.map(l => l.id));
        const newOnes = dispoLivs.filter(l => !existingIds.has(l.id));
        allLivs = [...allLivs, ...newOnes];
      }

      setMesLivraisons(allLivs);
    }
    setLoading(false);
  }

  async function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      );
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (_) {}
    setLocating(false);
  }

  async function devenirLivreur(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from('livreurs').insert({
      id: user.id, type_vehicule: form.type_vehicule,
      zone_couverture: form.zone_couverture,
      tarif_base: parseInt(form.tarif_base),
      tarif_par_km: parseInt(form.tarif_par_km),
    });
    setSaving(false);
    loadData();
  }

  async function toggleDisponible() {
    await supabase.from('livreurs')
      .update({ disponible: !monProfil.disponible }).eq('id', user.id);
    setMonProfil(p => ({ ...p, disponible: !p.disponible }));
  }

  async function updateStatut(livraisonId, statut) {
    const updateData = { statut, updated_at: new Date().toISOString() };
    if (statut === 'acceptee') {
      updateData.livreur_id = user.id;
    }
    if (statut === 'en_cours' && !mesLivraisons.find(l => l.id === livraisonId)?.qr_token) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let token = 'KBL-';
      for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)];
      updateData.qr_token = token;
    }
    const { data: liv } = await supabase.from('livraisons').update(updateData).eq('id', livraisonId).select('acheteur_id, prix_estime, ville_ramassage, ville_livraison').single();
    if (statut === 'livree' && monProfil) {
      await supabase.from('livreurs').update({ total_livraisons: (monProfil.total_livraisons || 0) + 1 }).eq('id', user.id);
    }
    loadData();
    if (liv) {
      try {
        const label = { acceptee: 'acceptée', en_cours: 'en cours de livraison', livree: 'livrée', annulee: 'annulée' }[statut] || statut;
        await supabase.from('notifications').insert({
          user_id: liv.acheteur_id,
          type: 'livraison',
          title: `Livraison ${label}`,
          body: `${liv.ville_ramassage} → ${liv.ville_livraison} • ${(liv.prix_estime || 0).toLocaleString('fr-FR')} FCFA`,
          data: { livraison_id: livraisonId, statut }
        });
      } catch (e) { console.error('notif erreur:', e); }
    }
  }

  if (!user) {
    return (
      <div className="page">
        <motion.button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
          <ArrowLeft size={18} /> Retour
        </motion.button>
        <div className="empty-state">
          <Truck size={60} className="icon" />
          <h3>Connectez-vous pour accéder aux livreurs</h3>
          <p>Créez un compte pour demander une livraison ou devenir coursier.</p>
        </div>
      </div>
    );
  }

  const mesLivs = mesLivraisons.filter(l => l.livreur_id === user.id);
  const mesCmd = mesLivraisons.filter(l => l.acheteur_id === user.id);
  const enAttenteCount = mesLivs.filter(l => l.statut === 'en_attente').length;

  return (
    <div className="page">
      <motion.button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onBack}>
        <ArrowLeft size={18} /> Retour
      </motion.button>

      <div className="profile-banner" style={{ marginBottom: 24 }}>
        <div className="profile-avatar"><Truck size={30} /></div>
        <div className="profile-info">
          <div className="profile-name">Livraison Konab Marcket</div>
          <div className="profile-email">Faites livrer vos achats ou devenez coursier</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <motion.div className="stat-card" whileHover={{ y: -2 }}
          onClick={() => setTab('disponibles')} style={{ cursor: 'pointer' }}>
          <Bike size={20} style={{ color: 'var(--vert)', margin: '0 auto 8px' }} />
          <div className="stat-num vert">{livreurs.filter(l => l.disponible).length}</div>
          <div className="stat-label">Coursiers dispo</div>
        </motion.div>
        <motion.div className="stat-card" whileHover={{ y: -2 }}
          onClick={() => setTab('mes_livraisons')} style={{ cursor: 'pointer', position: 'relative' }}>
          <Truck size={20} style={{ color: 'var(--or)', margin: '0 auto 8px' }} />
          <div className="stat-num or">{mesCmd.length + mesLivs.length}</div>
          <div className="stat-label">Mes livraisons</div>
          {enAttenteCount > 0 && <div className="badge badge-danger" style={{ marginTop: 4 }}>{enAttenteCount} en attente</div>}
          {notifCount > 0 && <div className="badge badge-danger" style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, padding: '2px 7px' }}>{notifCount}</div>}
        </motion.div>
        <motion.div className="stat-card" whileHover={{ y: -2 }}
          onClick={() => { setTab('demander'); setShowRequest(true); }} style={{ cursor: 'pointer' }}>
          <Package size={20} style={{ color: 'white', margin: '0 auto 8px' }} />
          <div className="stat-num blanc">{mesCmd.filter(c => c.statut !== 'livree').length}</div>
          <div className="stat-label">Demandes actives</div>
        </motion.div>
        <motion.div className="stat-card" whileHover={{ y: -2 }}
          onClick={() => setTab('devenir')} style={{ cursor: 'pointer' }}>
          <Star size={20} style={{ color: 'var(--or)', margin: '0 auto 8px' }} />
          <div className="stat-num or">{monProfil?.note_moyenne?.toFixed(1) || '—'}</div>
          <div className="stat-label">Ma note</div>
        </motion.div>
      </div>

      <AnimatePresence>
        {newDeliveryAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              background: 'linear-gradient(135deg, rgba(248,156,28,0.15), rgba(245,183,0,0.08))',
              border: '1px solid rgba(245,183,0,0.3)',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => {
              setTab('mes_livraisons');
              setNewDeliveryAlert(null);
              setNotifCount(0);
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--or), var(--vert), var(--or))' }} />
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--or), #F89C1C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Bell size={22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--or)', fontSize: 14, marginBottom: 2 }}>
                📢 Nouvelle demande de livraison !
              </div>
              <div style={{ color: 'var(--text2)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {newDeliveryAlert.ville_ramassage} → {newDeliveryAlert.ville_livraison} • {(newDeliveryAlert.prix_estime || 0).toLocaleString()} FCFA
              </div>
            </div>
            <motion.button
              className="btn btn-primary btn-sm"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                setTab('mes_livraisons');
                setNewDeliveryAlert(null);
                setNotifCount(0);
              }}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Voir →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'disponibles' ? 'active' : ''}`} onClick={() => setTab('disponibles')}>
          <Bike size={16} /> Coursiers
        </button>
        <button className={`tab-btn ${tab === 'demander' ? 'active' : ''}`} onClick={() => setTab('demander')}>
          <Package size={16} /> Demander
        </button>
        <button className={`tab-btn ${tab === 'mes_livraisons' ? 'active' : ''}`} onClick={() => setTab('mes_livraisons')}>
          <Truck size={16} /> Suivi {enAttenteCount > 0 && <span className="badge badge-danger" style={{ fontSize: 10, padding: '2px 6px', marginLeft: 4 }}>{enAttenteCount}</span>}
        </button>
        <button className={`tab-btn ${tab === 'devenir' ? 'active' : ''}`} onClick={() => setTab('devenir')}>
          <User size={16} /> Coursier
        </button>
      </div>

      {tab === 'disponibles' && (
        <div>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="section-title"><div className="section-title-bar" /> Coursiers disponibles</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="navbar-search" style={{ maxWidth: 200 }}>
                <Search size={14} style={{ marginLeft: 10, color: 'var(--text3)', flexShrink: 0 }} />
                <input placeholder="Rechercher par ville..."
                  value={searchVille} onChange={e => setSearchVille(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadData()}
                  style={{ padding: '8px 10px', fontSize: 13 }}
                />
              </div>
              {!userCoords ? (
                <motion.button className="btn btn-outline btn-sm"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleLocate} disabled={locating}
                  style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  <Crosshair size={14} /> {locating ? '...' : 'À proximité'}
                </motion.button>
              ) : (
                <span className="badge badge-success" style={{ fontSize: 11 }}>
                  📍 {userCoords.lat.toFixed(2)}, {userCoords.lng.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          {loading ? <SkeletonCards count={3} />
          : livreurs.filter(l => l.disponible).length === 0 ? (
            <div className="empty-state">
              <Bike size={60} className="icon" />
              <h3>Aucun coursier disponible</h3>
              {searchVille && <p>Aucun coursier trouvé pour "{searchVille}"</p>}
              {!searchVille && <p>Soyez le premier à devenir coursier !</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {livreurs.filter(l => l.disponible)
                .map(l => {
                  let dist = null;
                  if (userCoords && (l.latitude != null && l.longitude != null)) {
                    dist = haversine(userCoords.lat, userCoords.lng, l.latitude, l.longitude);
                  } else if (userCoords && l.zone_couverture && VILLES_COORDS[l.zone_couverture]) {
                    const vc = VILLES_COORDS[l.zone_couverture];
                    dist = haversine(userCoords.lat, userCoords.lng, vc.lat, vc.lng);
                  }
                  return { l, dist };
                })
                .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
                .map(({ l, dist }) => (
                  <LivreurCard key={l.id} livreur={{ ...l, nom: l.profiles?.nom || l.profiles?.entreprise_nom || 'Coursier' }} distanceKm={dist} />
                ))}
            </div>
          )}
        </div>
      )}

      {tab === 'demander' && (
        <div>
          <div className="card-surface" style={{ textAlign: 'center', padding: 28 }}>
            <Package size={44} style={{ color: 'var(--vert)', marginBottom: 14 }} />
            <h3 style={{ color: 'white', marginBottom: 6, fontSize: 17 }}>Besoin d'une livraison ?</h3>
            <p style={{ color: 'var(--text2)', marginBottom: 18, fontSize: 14 }}>Remplissez le formulaire pour qu'un coursier prenne en charge votre colis.</p>
            <motion.button className="btn btn-primary btn-lg"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowRequest(true)}>
              <Plus size={18} /> Nouvelle demande
            </motion.button>
          </div>
          {mesCmd.length > 0 && (
            <div>
              <div className="section-title" style={{ margin: '24px 0 16px' }}>
                <div className="section-title-bar" /> Mes demandes ({mesCmd.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mesCmd.map(l => (
                  <motion.div key={l.id} className="livraison-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2, borderColor: 'rgba(57,211,83,0.2)' }}
                    onClick={() => onShowLivraisonDetail && onShowLivraisonDetail(l.id)}
                    style={{ cursor: 'pointer' }}>
                    <div className="livraison-card-top">
                      <span className="livraison-annonce">{l.annonces?.titre || 'Livraison'}</span>
                      <span className="livraison-statut" style={{ color: STATUT_LIVRAISON[l.statut]?.color }}>
                        {STATUT_LIVRAISON[l.statut]?.icon} {STATUT_LIVRAISON[l.statut]?.label}
                      </span>
                    </div>
                    <div className="livraison-card-body">
                      <span><MapPin size={12} /> {l.ville_ramassage} → {l.ville_livraison}</span>
                      <span><DollarSign size={12} /> {l.prix_estime?.toLocaleString() || '—'} FCFA</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--vert)', marginTop: 8 }}>
                      <ExternalLink size={12} style={{ display: 'inline' }} /> Voir le détail
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'mes_livraisons' && (
        <div>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="section-title"><div className="section-title-bar" /> Livraisons ({mesLivs.length})</div>
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
              <p>Les demandes apparaîtront ici en temps réel.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mesLivs.filter(l => l.statut === 'en_cours' || l.statut === 'acceptee').length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="section-title" style={{ marginBottom: 12 }}>
                    <div className="section-title-bar" /> <QrCode size={16} /> Carte de livraison active
                  </div>
                  {mesLivs.filter(l => (l.statut === 'en_cours' || l.statut === 'acceptee') && l.qr_token).map(l => (
                    <DeliveryCard key={`card-${l.id}`} livraison={l} livreurNom={profile?.nom || 'Coursier'} />
                  ))}
                  {mesLivs.filter(l => (l.statut === 'en_cours' || l.statut === 'acceptee') && !l.qr_token).map(l => (
                    <div key={`hint-${l.id}`} className="card-surface" style={{ padding: 16, textAlign: 'center', marginBottom: 10 }}>
                      <QrCode size={24} style={{ color: 'var(--or)', marginBottom: 6 }} />
                      <div style={{ color: 'var(--text2)', fontSize: 13 }}>
                        Passez cette livraison <strong>"En cours"</strong> pour générer la carte QR
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {mesLivs.filter(l => l.statut === 'en_attente' && l.livreur_id !== user.id).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div className="section-title" style={{ marginBottom: 12 }}>
                    <div className="section-title-bar" /> 📢 Demandes disponibles ({mesLivs.filter(l => l.statut === 'en_attente' && l.livreur_id !== user.id).length})
                  </div>
                </div>
              )}
              {mesLivs.map(l => {
                const isAvailable = l.statut === 'en_attente' && l.livreur_id !== user.id;
                return (
                <motion.div key={l.id} className="livraison-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2, borderColor: 'rgba(57,211,83,0.2)' }}
                  onClick={() => onShowLivraisonDetail && onShowLivraisonDetail(l.id)}
                  style={{ cursor: 'pointer', borderLeft: isAvailable ? '3px solid var(--or)' : undefined }}>
                  <div className="livraison-card-top">
                    <span className="livraison-annonce">
                      {isAvailable && '📢 '}{l.annonces?.titre || 'Livraison'}
                      {l.acheteur_id === user.id && <span className="badge badge-info" style={{ marginLeft: 6, fontSize: 9 }}>Mon colis</span>}
                    </span>
                    <span className="livraison-statut" style={{ color: STATUT_LIVRAISON[l.statut]?.color }}>
                      {STATUT_LIVRAISON[l.statut]?.icon} {STATUT_LIVRAISON[l.statut]?.label}
                    </span>
                  </div>
                  <div className="livraison-card-body">
                    <span><MapPin size={12} /> {l.ville_ramassage} → {l.ville_livraison}</span>
                    <span><DollarSign size={12} /> {l.prix_estime?.toLocaleString()} FCFA</span>
                  </div>
                  {l.statut === 'en_attente' && (
                    <div className="livraison-card-actions" onClick={e => e.stopPropagation()}>
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
                    <div className="livraison-card-actions" onClick={e => e.stopPropagation()}>
                      <motion.button className="btn btn-primary btn-sm"
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => updateStatut(l.id, 'en_cours')}>
                        🚚 En cours
                      </motion.button>
                    </div>
                  )}
                  {l.statut === 'en_cours' && (
                    <div className="livraison-card-actions" onClick={e => e.stopPropagation()}>
                      <motion.button className="btn btn-primary btn-sm"
                        style={{ background: 'linear-gradient(135deg, var(--vert), var(--vert-dark))' }}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => updateStatut(l.id, 'livree')}>
                        ✅ Livrée
                      </motion.button>
                    </div>
                  )}
                </motion.div>
                );
              })}
            </div>
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
                  <div className="stat-label">Tarif base</div>
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
            prefillVille={prefillVille}
            onClose={(saved) => { setShowRequest(false); if (saved) loadData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
