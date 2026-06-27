import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Heart, Eye, MessageCircle, Edit2, Trash2, DollarSign } from 'lucide-react';
import { supabase, FORMULAS } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';
import { toast } from '../components/Toast';
import AnnonceModal from '../components/AnnonceModal';
import PaiementModal from '../components/PaiementModal';
import PosterGenerator from '../components/PosterGenerator';

const TABS = [
  { key: 'annonces', label: '📦 Annonces' },
  { key: 'favoris', label: '❤️ Favoris' },
  { key: 'offres', label: '💬 Offres' },
  { key: 'profil', label: '👤 Profil' },
  { key: 'formule', label: '⭐ Formule' },
  { key: 'livraisons', label: '🚚 Livraisons' },
];

export default function DashboardPage({ onShowCreate }) {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState('annonces');
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editAnnonce, setEditAnnonce] = useState(null);
  const [showPaiement, setShowPaiement] = useState('');
  const [profileForm, setProfileForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [favoris, setFavoris] = useState([]);
  const [loadingFav, setLoadingFav] = useState(false);
  const [offres, setOffres] = useState([]);
  const [loadingOffres, setLoadingOffres] = useState(false);
  const [adresses, setAdresses] = useState([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ libelle: 'Domicile', ville: '', adresse: '', telephone: '', instructions: '', est_defaut: false });
  const [savingAddr, setSavingAddr] = useState(false);
  const [livraisonsUser, setLivraisonsUser] = useState([]);
  const [loadingLiv, setLoadingLiv] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [posterAnnonce, setPosterAnnonce] = useState(null);

  useEffect(() => {
    if (profile) setProfileForm({ nom: profile.nom||'', telephone: profile.telephone||'', ville: profile.ville||'', secteur: profile.secteur||'', entreprise_nom: profile.entreprise_nom||'', bio: profile.bio||'', notif_new_message: profile.notif_new_message !== false, notif_livraison: profile.notif_livraison !== false });
  }, [profile]);

  const fetchAnnonces = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('annonces').select('*, profiles(nom, entreprise_nom, certifie, abonnement)').eq('user_id', user.id).order('created_at', { ascending: false });
    setAnnonces(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAnnonces(); }, [fetchAnnonces]);
  useEffect(() => { if (user) { loadFavoris(); loadOffres(); loadAdresses(); loadLivraisons(); countMessages(); } }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFavoris() {
    setLoadingFav(true);
    const { data } = await supabase.from('favoris')
      .select('*, annonces(*, profiles(nom, entreprise_nom, certifie, abonnement))')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setFavoris(data);
    setLoadingFav(false);
  }

  async function loadOffres() {
    setLoadingOffres(true);
    const { data } = await supabase.from('offres')
      .select('*, annonces(titre, prix, affiche_url, ville, type, profiles(nom)), profiles:acheteur_id(nom)')
      .eq('vendeur_id', user.id).order('created_at', { ascending: false });
    if (data) setOffres(data);
    setLoadingOffres(false);
  }

  async function loadAdresses() {
    const { data } = await supabase.from('adresses').select('*').eq('user_id', user.id).order('est_defaut', { ascending: false });
    if (data) setAdresses(data);
  }

  async function loadLivraisons() {
    setLoadingLiv(true);
    const { data } = await supabase.from('livraisons').select('*').eq('acheteur_id', user.id).order('created_at', { ascending: false });
    if (data) setLivraisonsUser(data);
    setLoadingLiv(false);
  }

  async function countMessages() {
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('destinataire_id', user.id).eq('lu', false);
    setMsgCount(count || 0);
  }

  const handleEdit = (a) => setEditAnnonce(a);
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    await supabase.from('annonces').delete().eq('id', id);
    fetchAnnonces();
  };

  const activeAnnonces = annonces.filter(a => a.actif);
  const totalVues = annonces.reduce((s, a) => s + (a.vues || 0), 0);

  const widgets = [
    { label: 'Annonces actives', value: activeAnnonces.length, icon: <Package size={22} />, color: 'var(--vert)', bg: 'var(--vert-bg)', change: '+2', up: true },
    { label: 'Vues totales', value: totalVues, icon: <Eye size={22} />, color: 'var(--orange)', bg: 'var(--orange-bg)', change: '+12%', up: true },
    { label: 'Messages', value: msgCount, icon: <MessageCircle size={22} />, color: '#6366F1', bg: 'rgba(99,102,241,0.1)', change: msgCount > 0 ? 'Nouveaux' : 'Aucun', up: msgCount > 0 },
    { label: 'Revenus', value: `${annonces.filter(a => a.formule === 'premium').length} premiums`, icon: <DollarSign size={22} />, color: '#34C759', bg: 'var(--vert-bg)', change: '', up: true },
  ];

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update(profileForm).eq('id', user.id);
    if (!error) { toast.success('Profil mis à jour'); refreshProfile(); }
    else toast.error('Erreur: ' + error.message);
    setSaving(false);
  }

  async function handleFormulaChoice(formule) {
    if (formule === 'basic') {
      const { error } = await supabase.from('profiles').update({ abonnement: 'basic' }).eq('id', user.id);
      if (!error) { toast.success('Compte basic activé'); refreshProfile(); } else toast.error('Erreur');
      return;
    }
    setShowPaiement(formule);
  }

  async function saveAddress(e) {
    e.preventDefault();
    setSavingAddr(true);
    if (addrForm.est_defaut) await supabase.from('adresses').update({ est_defaut: false }).eq('user_id', user.id);
    const { error } = await supabase.from('adresses').insert({ ...addrForm, user_id: user.id });
    if (!error) { setShowAddrForm(false); setAddrForm({ libelle: 'Domicile', ville: '', adresse: '', telephone: '', instructions: '', est_defaut: false }); loadAdresses(); toast.success('Adresse ajoutée'); }
    else toast.error('Erreur');
    setSavingAddr(false);
  }

  async function deleteAddress(id) {
    if (!window.confirm('Supprimer cette adresse ?')) return;
    await supabase.from('adresses').delete().eq('id', id);
    loadAdresses();
  }

  const renderTab = () => {
    switch (tab) {
      case 'annonces':
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Mes annonces</h3>
                <p style={{ fontSize: 13, color: 'var(--text3)' }}>{annonces.length} annonce{annonces.length > 1 ? 's' : ''} · {activeAnnonces.length} active{activeAnnonces.length > 1 ? 's' : ''}</p>
              </div>
              <motion.button className="btn btn-primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onShowCreate}>
                <Plus size={16} /> Nouvelle annonce
              </motion.button>
            </div>
            {loading ? (
              <SkeletonCards count={3} />
            ) : annonces.length === 0 ? (
              <div className="text-center" style={{ padding: '60px 20px' }}>
                <Package size={48} style={{ color: 'var(--text3)', marginBottom: 16 }} />
                <h4 style={{ marginBottom: 8, color: 'var(--text)' }}>Aucune annonce pour le moment</h4>
                <p style={{ color: 'var(--text3)', marginBottom: 20 }}>Publiez votre première annonce et commencez à vendre</p>
                <button className="btn btn-primary" onClick={onShowCreate}><Plus size={16} /> Publier</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {annonces.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg2)' }}>
                      {(a.affiche_url || a.images?.[0]) ? <img src={a.affiche_url || a.images?.[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)' }}><span style={{ fontSize: 24 }}>📷</span></div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{a.titre}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)' }}>
                        <span>{a.ville}</span>
                        <span>•</span>
                        <span><Eye size={12} style={{ display: 'inline' }} /> {a.vues || 0}</span>
                        <span>•</span>
                        <span>{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                        {!a.actif && <span className="badge badge-danger">Inactive</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <motion.button className="btn btn-ghost btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setPosterAnnonce(a)}><span style={{ fontSize: 14 }}>🖼️</span> Affiche</motion.button>
                      <motion.button className="btn btn-ghost btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleEdit(a)}><Edit2 size={14} /></motion.button>
                      <motion.button className="btn btn-ghost btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ color: 'var(--danger)' }} onClick={() => handleDelete(a.id)}><Trash2 size={14} /></motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'favoris':
        return (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>❤️ Mes favoris</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Annonces que vous avez aimées</p>
            {loadingFav ? <SkeletonCards count={3} /> : favoris.length === 0 ? (
              <div className="text-center" style={{ padding: '60px 20px' }}>
                <Heart size={48} style={{ color: 'var(--text3)', marginBottom: 16 }} />
                <h4 style={{ color: 'var(--text)', marginBottom: 8 }}>Aucun favori</h4>
                <p style={{ color: 'var(--text3)' }}>Ajoutez des annonces à vos favoris en cliquant sur le cœur ❤️</p>
              </div>
            ) : (
              <div className="products-grid">
                {favoris.map(f => f.annonces && <AnnonceCard key={f.id} annonce={f.annonces} showFavoriBtn />)}
              </div>
            )}
          </div>
        );

      case 'offres':
        return (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>💬 Offres reçues</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Négociations sur vos annonces</p>
            {loadingOffres ? <SkeletonCards count={3} /> : offres.length === 0 ? (
              <div className="text-center" style={{ padding: '60px 20px' }}>
                <MessageCircle size={48} style={{ color: 'var(--text3)', marginBottom: 16 }} />
                <h4 style={{ color: 'var(--text)', marginBottom: 8 }}>Aucune offre</h4>
                <p style={{ color: 'var(--text3)' }}>Les offres apparaîtront ici quand des clients vous contacteront</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {offres.map(o => (
                  <div key={o.id} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--bg2)' }}>{o.annonces?.affiche_url ? <img src={o.annonces.affiche_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: 20 }}>📦</div>}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{o.annonces?.titre || 'Annonce'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Offre de {o.profiles?.nom || 'Inconnu'} · {o.montant ? `${parseInt(o.montant).toLocaleString()} FCFA` : 'Négociable'}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'profil':
        return (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>👤 Mon profil</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Informations personnelles et boutique</p>
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Nom complet</label>
                  <input className="form-control" value={profileForm.nom} onChange={e => setProfileForm({ ...profileForm, nom: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input className="form-control" value={profileForm.telephone} onChange={e => setProfileForm({ ...profileForm, telephone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nom de l'entreprise</label>
                <input className="form-control" placeholder="Optionnel" value={profileForm.entreprise_nom} onChange={e => setProfileForm({ ...profileForm, entreprise_nom: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-control" rows={3} placeholder="Parlez de vous..." value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Ville</label>
                  <input className="form-control" value={profileForm.ville} onChange={e => setProfileForm({ ...profileForm, ville: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Secteur</label>
                  <input className="form-control" value={profileForm.secteur} onChange={e => setProfileForm({ ...profileForm, secteur: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={profileForm.notif_new_message} onChange={e => setProfileForm({ ...profileForm, notif_new_message: e.target.checked })} />
                  Notifications messages
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={profileForm.notif_livraison} onChange={e => setProfileForm({ ...profileForm, notif_livraison: e.target.checked })} />
                  Notifications livraisons
                </label>
              </div>
              <motion.button type="submit" className="btn btn-primary" disabled={saving}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ alignSelf: 'flex-start' }}>
                {saving ? 'Enregistrement...' : '💾 Enregistrer'}
              </motion.button>
            </form>

            <div style={{ marginTop: 40 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>📍 Carnet d'adresses</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {adresses.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{a.libelle} {a.est_defaut && <span className="badge badge-success">Défaut</span>}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{a.adresse}, {a.ville} · {a.telephone}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteAddress(a.id)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              {showAddrForm ? (
                <form onSubmit={saveAddress} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input className="form-control" placeholder="Libellé (Domicile, Bureau...)" value={addrForm.libelle} onChange={e => setAddrForm({ ...addrForm, libelle: e.target.value })} />
                    <input className="form-control" placeholder="Ville" value={addrForm.ville} onChange={e => setAddrForm({ ...addrForm, ville: e.target.value })} required />
                  </div>
                  <input className="form-control" placeholder="Adresse" value={addrForm.adresse} onChange={e => setAddrForm({ ...addrForm, adresse: e.target.value })} required />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input className="form-control" placeholder="Téléphone" value={addrForm.telephone} onChange={e => setAddrForm({ ...addrForm, telephone: e.target.value })} />
                    <input className="form-control" placeholder="Instructions (optionnel)" value={addrForm.instructions} onChange={e => setAddrForm({ ...addrForm, instructions: e.target.value })} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={addrForm.est_defaut} onChange={e => setAddrForm({ ...addrForm, est_defaut: e.target.checked })} />
                    Adresse par défaut
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button type="submit" className="btn btn-primary btn-sm" disabled={savingAddr} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>{savingAddr ? '...' : 'Ajouter'}</motion.button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddrForm(false)}>Annuler</button>
                  </div>
                </form>
              ) : (
                <motion.button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddrForm(true)}>
                  <Plus size={14} /> Ajouter une adresse
                </motion.button>
              )}
            </div>
          </div>
        );

      case 'formule':
        return (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>⭐ Formule d'abonnement</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Choisissez la formule qui correspond à vos besoins</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {FORMULAS.map(f => {
                const isActive = profile?.abonnement === f.id;
                return (
                  <motion.div key={f.id} whileHover={{ y: -4 }} style={{
                    background: 'var(--surface)', border: `2px solid ${isActive ? 'var(--vert)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', padding: 28, position: 'relative',
                    boxShadow: isActive ? '0 4px 20px rgba(52,199,89,0.15)' : 'none',
                  }}>
                    {isActive && <div className="badge badge-success" style={{ position: 'absolute', top: 12, right: 12 }}>Actif</div>}
                    <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                    <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{f.name}</h4>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{f.desc}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--vert)', marginBottom: 16 }}>
                      {f.prix === 0 ? 'Gratuit' : `${f.prix.toLocaleString()} FCFA`}
                      {f.prix > 0 && <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 400 }}>/{f.duree}</span>}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {f.features.map((feat, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                          <span className="feat-check">✓</span> {feat}
                        </li>
                      ))}
                    </ul>
                    <motion.button className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{ width: '100%', justifyContent: 'center' }}
                      disabled={isActive}
                      onClick={() => handleFormulaChoice(f.id)}>
                      {isActive ? 'Formule actuelle' : f.prix === 0 ? 'Activer gratuit' : 'Choisir'}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );

      case 'livraisons':
        return (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🚚 Mes livraisons</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Suivi de vos commandes en cours</p>
            {loadingLiv ? <SkeletonCards count={3} /> : livraisonsUser.length === 0 ? (
              <div className="text-center" style={{ padding: '60px 20px' }}>
                <span style={{ fontSize: 48 }}>🚚</span>
                <h4 style={{ color: 'var(--text)', marginBottom: 8 }}>Aucune livraison</h4>
                <p style={{ color: 'var(--text3)' }}>Vos commandes avec livraison apparaîtront ici</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {livraisonsUser.map(l => (
                  <div key={l.id} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--vert-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🚚</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Livraison #{l.id.slice(0, 8)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{l.ville_depart} → {l.ville_arrivee} · {l.statut}</div>
                    </div>
                    <span className="badge badge-success">{l.statut}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-alt)', fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            👋 Bon retour, {profile?.nom || user?.email}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text3)' }}>
            Gérez vos annonces et votre boutique en un clin d'œil
          </p>
        </div>

        <div className="dashboard-grid">
          {widgets.map((w, i) => (
            <motion.div key={i} className="dashboard-widget" whileHover={{ y: -2 }}>
              <div className="dashboard-widget-header">
                <div className="dashboard-widget-icon" style={{ background: w.bg, color: w.color }}>{w.icon}</div>
                {w.change && <span className={`dashboard-widget-change ${w.up ? 'up' : 'down'}`}>{w.change}</span>}
              </div>
              <div className="dashboard-widget-label">{w.label}</div>
              <div className="dashboard-widget-value">{w.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="tabs" style={{ marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editAnnonce && <AnnonceModal annonce={editAnnonce} onClose={() => { setEditAnnonce(null); fetchAnnonces(); }} onSaved={() => { setEditAnnonce(null); fetchAnnonces(); toast.success('Annonce mise à jour'); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {showPaiement && <PaiementModal formule={showPaiement} onClose={() => setShowPaiement('')} onSuccess={() => { setShowPaiement(''); refreshProfile(); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {posterAnnonce && <PosterGenerator annonce={posterAnnonce} onClose={() => setPosterAnnonce(null)} />}
      </AnimatePresence>
    </div>
  );
}
