import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, TrendingUp, Crown, User, Plus, CreditCard, BarChart3, Settings, Heart, X, Eye, MessageCircle, MapPin, Phone, Truck, Edit2, Trash2, Clock, Image as ImageIcon, Camera } from 'lucide-react';
import { supabase, FORMULAS } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';
import { toast } from '../components/Toast';
import AnnonceModal from '../components/AnnonceModal';
import PaiementModal from '../components/PaiementModal';
import PosterGenerator from '../components/PosterGenerator';
import { QRScannerModal } from '../components/DeliveryCard';

export default function DashboardPage({ onShowCreate }) {
  const { user, profile, refreshProfile, maxAnnonces } = useAuth();
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
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ libelle: 'Domicile', ville: '', adresse: '', telephone: '', instructions: '', est_defaut: false });
  const [savingAddr, setSavingAddr] = useState(false);
  const [livraisonsUser, setLivraisonsUser] = useState([]);
  const [loadingLiv, setLoadingLiv] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [posterAnnonce, setPosterAnnonce] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

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
    const annonceIds = annonces.map(a => a.id);
    if (annonceIds.length === 0) { setLoadingOffres(false); return; }
    const { data } = await supabase.from('offres')
      .select('*, annonces(*), profiles(nom)')
      .in('annonce_id', annonceIds)
      .order('created_at', { ascending: false });
    if (data) setOffres(data);
    setLoadingOffres(false);
  }

  async function loadAdresses() {
    setLoadingAddr(true);
    const { data } = await supabase.from('adresses')
      .select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setAdresses(data);
    setLoadingAddr(false);
  }

  async function loadLivraisons() {
    setLoadingLiv(true);
    const { data } = await supabase.from('livraisons')
      .select('*, livreurs(*, profiles(nom, telephone))')
      .eq('acheteur_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setLivraisonsUser(data);
    setLoadingLiv(false);
  }

  async function countMessages() {
    const { count } = await supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('destinataire_id', user.id).eq('lu', false);
    setMsgCount(count || 0);
  }

  async function deleteAnnonce(id) {
    if (!window.confirm('Supprimer définitivement cette annonce ?')) return;
    await supabase.from('annonces').delete().eq('id', id);
    fetchAnnonces();
    toast('Annonce supprimée', 'success');
  }

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from('profiles').update({ ...profileForm, updated_at: new Date().toISOString() }).eq('id', user.id);
    await refreshProfile(); setSaving(false);
    if (!error) toast('Profil mis à jour !', 'success'); else toast('Erreur lors de la mise à jour', 'error');
  }

  async function removeFavori(favoriId) {
    await supabase.from('favoris').delete().eq('id', favoriId);
    setFavoris(prev => prev.filter(f => f.id !== favoriId));
  }

  async function handleOfferAction(offerId, statut) {
    await supabase.from('offres').update({ statut }).eq('id', offerId);
    loadOffres();
    toast(statut === 'acceptee' ? 'Offre acceptée ✓' : 'Offre refusée', statut === 'acceptee' ? 'success' : 'error');
  }

  async function saveAddress(e) {
    e.preventDefault(); setSavingAddr(true);
    const { error } = await supabase.from('adresses').insert({ ...addrForm, user_id: user.id });
    if (!error) { toast('Adresse enregistrée ✓', 'success'); setShowAddrForm(false); setAddrForm({ libelle: 'Domicile', ville: '', adresse: '', telephone: '', instructions: '', est_defaut: false }); loadAdresses(); }
    else toast('Erreur : ' + error.message, 'error');
    setSavingAddr(false);
  }

  async function deleteAddress(id) {
    if (!window.confirm('Supprimer cette adresse ?')) return;
    await supabase.from('adresses').delete().eq('id', id);
    loadAdresses();
  }

  const canCreate  = annonces.filter(a => a.actif).length < maxAnnonces();
  const formuleKey = profile?.abonnement || 'basic';
  const expDate    = profile?.abonnement_expire ? new Date(profile.abonnement_expire).toLocaleDateString('fr-FR') : null;
  const initials   = (profile?.nom || user?.email || 'U').slice(0, 2).toUpperCase();
  const totalVues  = annonces.reduce((sum, a) => sum + (a.vues || 0), 0);
  const totalFav   = favoris.length;
  const totalMsg   = msgCount;

  const tabs = [
    { id: 'annonces', label: 'Mes annonces', icon: <Package size={16} /> },
    { id: 'favoris', label: 'Favoris', icon: <Heart size={16} /> },
    { id: 'stats', label: 'Statistiques', icon: <BarChart3 size={16} /> },
    { id: 'offres', label: 'Offres', icon: <TrendingUp size={16} /> },
    { id: 'commandes', label: 'Commandes', icon: <Truck size={16} /> },
    { id: 'adresses', label: 'Adresses', icon: <MapPin size={16} /> },
    { id: 'abonnement', label: 'Abonnement', icon: <Crown size={16} /> },
    { id: 'profil', label: 'Mon profil', icon: <User size={16} /> },
  ];

  return (
    <div className="page">
      <motion.div className="profile-banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="profile-avatar">{initials}</div>
        <div className="profile-info">
          <div className="profile-name">{profile?.nom || user?.email}</div>
          <div className="profile-email">{user?.email}</div>
          {profile?.entreprise_nom && <div style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 8 }}>{profile.entreprise_nom}</div>}
          <div className="profile-badges">
            <span className={`badge ${formuleKey === 'basic' ? 'badge-gray' : formuleKey === 'premium' ? 'badge-warning' : 'badge-gold'}`}>
              {formuleKey === 'basic' ? 'Basique' : formuleKey === 'premium' ? 'Premium' : 'Certifié Entreprise'}
            </span>
            {expDate && <span className="badge badge-success">✅ Actif jusqu'au {expDate}</span>}
            {profile?.certifie && <span className="badge badge-gold">⭐ Certifié</span>}
          </div>
        </div>
      </motion.div>

      <motion.div className="stats-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="stat-card">
          <BarChart3 size={20} style={{ color: 'var(--vert)', margin: '0 auto 8px' }} />
          <div className="stat-num vert">{annonces.length}</div>
          <div className="stat-label">Publiées</div>
        </div>
        <div className="stat-card">
          <Package size={20} style={{ color: 'var(--or)', margin: '0 auto 8px' }} />
          <div className="stat-num or">{annonces.filter(a=>a.actif).length}</div>
          <div className="stat-label">Actives</div>
        </div>
        <div className="stat-card">
          <Eye size={20} style={{ color: 'white', margin: '0 auto 8px' }} />
          <div className="stat-num blanc">{totalVues}</div>
          <div className="stat-label">Vues totales</div>
        </div>
        <div className="stat-card">
          <Heart size={20} style={{ color: 'var(--danger)', margin: '0 auto 8px' }} />
          <div className="stat-num or">{totalFav}</div>
          <div className="stat-label">Favoris reçus</div>
        </div>
      </motion.div>

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {tab === 'annonces' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>
                  <div className="section-title-bar" />
                  <Package size={20} /> Mes annonces ({annonces.filter(a=>a.actif).length}/{maxAnnonces()})
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button className="btn btn-primary"
                    onClick={() => onShowCreate && onShowCreate()}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    disabled={!canCreate}
                  >
                    <Plus size={16} /> Publier
                  </motion.button>
                </div>
              </div>
              {!canCreate && annonces.filter(a=>a.actif).length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                  ⚠️ Limite de {maxAnnonces()} annonces atteinte.
                  <button onClick={() => setTab('abonnement')} style={{ background:'none', border:'none', color:'var(--vert)', fontWeight:800, cursor:'pointer', marginLeft:8 }}>
                    Passer en premium →
                  </button>
                </div>
              )}
              {loading ? <SkeletonCards count={3} />
              : annonces.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><Package size={60} style={{ color: 'var(--text3)' }} /></div>
                  <h3>Aucune annonce publiée</h3>
                  <p>Publiez votre première annonce et commencez à recevoir des contacts !</p>
                  <motion.button className="btn btn-primary btn-lg"
                    onClick={() => onShowCreate && onShowCreate()}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Plus size={18} /> Créer ma première annonce
                  </motion.button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {annonces.map(a => {
                    const imgCount = (a.images?.length || 0) + (a.affiche_url ? 1 : 0);
                    return (
                      <motion.div key={a.id} className="dash-annonce-card"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        layout
                      >
                        <img className="dash-annonce-thumb"
                          src={a.affiche_url || (a.images?.[0]) || ''}
                          alt={a.titre}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <div className="dash-annonce-body">
                          <div className="dash-annonce-title">{a.titre}</div>
                          {a.description && (
                            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {a.description}
                            </div>
                          )}
                          <div className="dash-annonce-meta">
                            <span>{a.ville || 'Non précisée'}</span>
                            <span>{a.secteur}</span>
                            {a.prix != null && <span style={{ color: 'var(--vert)', fontWeight: 700 }}>{a.prix === 0 ? 'Gratuit' : new Intl.NumberFormat('fr-FR').format(a.prix) + ' FCFA'}</span>}
                            {!a.actif && <span className="badge badge-gray">Inactive</span>}
                            {a.actif && <span className="badge badge-success">Active</span>}
                            {imgCount > 1 && <span><ImageIcon size={12} style={{ display: 'inline' }} /> {imgCount} photos</span>}
                          </div>
                          <div className="dash-annonce-stats">
                            <span><Eye size={12} style={{ display: 'inline' }} /> {a.vues || 0} vues</span>
                            <span><MessageCircle size={12} style={{ display: 'inline' }} /> 0</span>
                            <span><Clock size={12} style={{ display: 'inline' }} /> {new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        <div className="dash-annonce-actions" style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'stretch' }}>
                          <motion.button className="btn btn-sm"
                            style={{ background: 'rgba(57,211,83,0.1)', color: 'var(--vert)', borderRadius: 'var(--radius-sm)', padding: '7px 12px', whiteSpace: 'nowrap', fontSize: 11 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); setEditAnnonce(a); }}>
                            <Edit2 size={12} style={{ marginRight: 4, display: 'inline' }} /> Modifier
                          </motion.button>
                          <motion.button className="btn btn-sm"
                            style={{ background: 'rgba(245,183,0,0.1)', color: 'var(--or)', borderRadius: 'var(--radius-sm)', padding: '7px 12px', fontSize: 11 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); setPosterAnnonce(a); }}>
                            <ImageIcon size={12} style={{ marginRight: 4, display: 'inline' }} /> Affiche
                          </motion.button>
                          <motion.button className="btn btn-sm"
                            style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '7px 12px', fontSize: 11 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); deleteAnnonce(a.id); }}>
                            <Trash2 size={12} style={{ marginRight: 4, display: 'inline' }} /> Suppr.
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'favoris' && (
            <div>
              <div className="section-title" style={{ marginBottom: 20 }}>
                <div className="section-title-bar" />
                <Heart size={20} /> Mes favoris ({favoris.length})
              </div>
              {loadingFav ? <SkeletonCards count={3} />
              : favoris.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><Heart size={60} style={{ color: 'var(--text3)' }} /></div>
                  <h3>Aucun favori</h3>
                  <p>Ajoutez des annonces en favoris en cliquant sur le cœur.</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {favoris.map(f => (
                    <div key={f.id} style={{ position: 'relative' }}>
                      <AnnonceCard annonce={f.annonces} showFavoriBtn />
                      <motion.button className="btn btn-sm"
                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,71,87,0.2)', color: 'var(--danger)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', zIndex: 2, border: 'none', cursor: 'pointer' }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => removeFavori(f.id)}>
                        <X size={14} /> Retirer
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'stats' && (
            <div>
              <div className="section-title" style={{ marginBottom: 20 }}>
                <div className="section-title-bar" />
                <BarChart3 size={20} /> Statistiques avancées
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(57,211,83,0.1)' }}>
                    <Eye size={20} style={{ color: 'var(--vert)' }} />
                  </div>
                  <div className="stat-num vert">{totalVues}</div>
                  <div className="stat-label">Vues totales</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(245,183,0,0.1)' }}>
                    <Heart size={20} style={{ color: 'var(--or)' }} />
                  </div>
                  <div className="stat-num or">{totalFav}</div>
                  <div className="stat-label">Favoris reçus</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(57,211,83,0.1)' }}>
                    <MessageCircle size={20} style={{ color: 'var(--vert)' }} />
                  </div>
                  <div className="stat-num vert">{totalMsg}</div>
                  <div className="stat-label">Messages non lus</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(248,156,28,0.1)' }}>
                    <Package size={20} style={{ color: 'var(--orange)' }} />
                  </div>
                  <div className="stat-num or">{annonces.filter(a => a.actif).length}</div>
                  <div className="stat-label">Annonces actives</div>
                </div>
              </div>
              <div className="card-surface">
                <div className="card-surface-title"><TrendingUp size={18} /> Performance par annonce</div>
                {annonces.length === 0 ? (
                  <p style={{ color: 'var(--text3)', fontSize: 14 }}>Aucune donnée disponible.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {annonces.slice(0, 10).map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'white' }}>{a.titre}</div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text3)' }}>
                          <span><Eye size={13} style={{ display: 'inline' }} /> {a.vues || 0}</span>
                          <span className={`badge ${a.actif ? 'badge-success' : 'badge-danger'}`}>{a.actif ? 'Actif' : 'Inactif'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'offres' && (
            <div>
              <div className="section-title" style={{ marginBottom: 20 }}>
                <div className="section-title-bar" />
                <TrendingUp size={20} /> Offres reçues ({offres.length})
              </div>
              {loadingOffres ? <div className="loader"><div className="spinner" /></div>
              : offres.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><TrendingUp size={60} style={{ color: 'var(--text3)' }} /></div>
                  <h3>Aucune offre reçue</h3>
                  <p>Les offres de vos acheteurs apparaîtront ici.</p>
                </div>
              ) : (
                <div className="offers-list">
                  {offres.map(o => (
                    <div key={o.id} className="offre-card">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: 14, marginBottom: 4 }}>
                          {o.profiles?.nom} — <span className="offre-montant">{o.montant.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>
                          sur "{o.annonces?.titre || 'Annonce'}"
                        </div>
                        {o.message && <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic' }}>"{o.message}"</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className={`badge ${o.statut === 'en_attente' ? 'badge-warning' : o.statut === 'acceptee' ? 'badge-success' : 'badge-danger'}`}>
                          {o.statut === 'en_attente' ? 'En attente' : o.statut === 'acceptee' ? 'Acceptée' : 'Refusée'}
                        </span>
                        {o.statut === 'en_attente' && (
                          <>
                            <motion.button className="btn btn-sm" style={{ background: 'rgba(57,211,83,0.1)', color: 'var(--vert)', borderRadius: 'var(--radius-sm)' }}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => handleOfferAction(o.id, 'acceptee')}>
                              ✓ Accepter
                            </motion.button>
                            <motion.button className="btn btn-sm" style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => handleOfferAction(o.id, 'refusee')}>
                              ✕ Refuser
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'commandes' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div className="section-title">
                  <div className="section-title-bar" />
                  <Truck size={20} /> Historique des commandes ({livraisonsUser.length})
                </div>
                <motion.button className="btn btn-primary btn-sm"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowQRScanner(true)}>
                  <Camera size={16} /> Valider ma livraison
                </motion.button>
              </div>
              {loadingLiv ? <div className="loader"><div className="spinner" /></div>
              : livraisonsUser.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><Truck size={60} style={{ color: 'var(--text3)' }} /></div>
                  <h3>Aucune commande</h3>
                  <p>Vos commandes de livraison apparaîtront ici.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {livraisonsUser.map(l => (
                    <div key={l.id} className="offre-card">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span className={`badge ${l.statut === 'livree' ? 'badge-success' : l.statut === 'annulee' ? 'badge-danger' : l.statut === 'en_attente' ? 'badge-warning' : 'badge-info'}`}>
                            {l.statut === 'en_attente' ? 'En attente' : l.statut === 'acceptee' ? 'Acceptée' : l.statut === 'en_cours' ? 'En cours' : l.statut === 'livree' ? 'Livrée' : 'Annulée'}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                            {l.prix_estime.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                          {l.ville_ramassage} → {l.ville_livraison}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {new Date(l.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      {l.statut === 'livree' && l.note_livreur && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: 'var(--or)', fontSize: 14 }}>{'★'.repeat(l.note_livreur)}{'☆'.repeat(5-l.note_livreur)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Noté</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'adresses' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>
                  <div className="section-title-bar" />
                  <MapPin size={20} /> Carnet d'adresses
                </div>
                <motion.button className="btn btn-primary btn-sm"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAddrForm(true)}>
                  <Plus size={16} /> Ajouter
                </motion.button>
              </div>

              {showAddrForm && (
                <div className="card-surface" style={{ marginBottom: 20 }}>
                  <form onSubmit={saveAddress}>
                    <div className="two-col">
                      <div className="form-group">
                        <label className="form-label">Libellé</label>
                        <select className="form-control" value={addrForm.libelle}
                          onChange={e => setAddrForm(f => ({...f, libelle: e.target.value}))}>
                          <option>Domicile</option>
                          <option>Travail</option>
                          <option>Autre</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ville</label>
                        <input className="form-control" value={addrForm.ville}
                          onChange={e => setAddrForm(f => ({...f, ville: e.target.value}))} required placeholder="Ouagadougou" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Adresse complète</label>
                      <input className="form-control" value={addrForm.adresse}
                        onChange={e => setAddrForm(f => ({...f, adresse: e.target.value}))} required placeholder="Secteur 12, Rue 34, Porte 5" />
                    </div>
                    <div className="two-col">
                      <div className="form-group">
                        <label className="form-label">Téléphone</label>
                        <input className="form-control" value={addrForm.telephone}
                          onChange={e => setAddrForm(f => ({...f, telephone: e.target.value}))} required placeholder="+226 XX XX XX XX" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Instructions (optionnel)</label>
                        <input className="form-control" value={addrForm.instructions}
                          onChange={e => setAddrForm(f => ({...f, instructions: e.target.value}))} placeholder="Près du marché, sonnette verte" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <motion.button type="button" className="btn btn-ghost" style={{ borderRadius: 'var(--radius-sm)' }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddrForm(false)}>
                        Annuler
                      </motion.button>
                      <motion.button type="submit" className="btn btn-primary"
                        disabled={savingAddr} style={{ borderRadius: 'var(--radius-sm)' }}
                        whileHover={{ scale: savingAddr ? 1 : 1.03 }}
                        whileTap={{ scale: savingAddr ? 1 : 0.97 }}>
                        {savingAddr ? <><span className="btn-spinner" /> Sauvegarde...</> : '✅ Enregistrer'}
                      </motion.button>
                    </div>
                  </form>
                </div>
              )}

              {loadingAddr ? <div className="loader"><div className="spinner" /></div>
              : adresses.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><MapPin size={60} style={{ color: 'var(--text3)' }} /></div>
                  <h3>Aucune adresse enregistrée</h3>
                  <p>Ajoutez vos adresses pour faciliter les livraisons.</p>
                </div>
              ) : (
                <div className="addresses-grid">
                  {adresses.map(a => (
                    <div key={a.id} className="adresse-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span className={`badge ${a.libelle === 'Domicile' ? 'badge-success' : a.libelle === 'Travail' ? 'badge-info' : 'badge-warning'}`}>
                          {a.libelle}
                        </span>
                        {a.est_defaut && <span className="badge badge-gold">⭐ Par défaut</span>}
                      </div>
                      <div style={{ fontWeight: 700, color: 'white', marginBottom: 4 }}>{a.adresse}</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
                        <MapPin size={12} style={{ display: 'inline' }} /> {a.ville}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>
                        <Phone size={12} style={{ display: 'inline' }} /> {a.telephone}
                      </div>
                      {a.instructions && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 8 }}>📌 {a.instructions}</div>}
                      <motion.button className="btn btn-sm" style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 12 }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => deleteAddress(a.id)}>
                        <X size={12} /> Supprimer
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'abonnement' && (
            <div>
              <div className="section-title" style={{ marginBottom: 24 }}>
                <div className="section-title-bar" /> <Crown size={22} /> Choisissez votre formule
              </div>
              {formuleKey !== 'basic' && (
                <div className="alert alert-info">
                  ✅ Abonnement actuel : <strong>{FORMULAS[formuleKey]?.name}</strong>{expDate && ` — valide jusqu'au ${expDate}`}
                </div>
              )}
              <div className="formules-grid">
                <motion.div className="formule-card" whileHover={{ y: -4 }}>
                  <div className="formule-icon">🌱</div>
                  <div className="formule-name">Basique</div>
                  <div className="formule-price" style={{ background: 'none', WebkitTextFillColor: 'var(--text2)', color: 'var(--text2)' }}>Gratuit</div>
                  <ul className="formule-features">
                    <li><span className="feat-check">✓</span> 10 annonces max</li>
                    <li><span className="feat-check">✓</span> Tous les types</li>
                    <li><span className="feat-check">✓</span> Contact WhatsApp</li>
                    <li><span className="feat-check">✓</span> Profil public</li>
                  </ul>
                  {formuleKey === 'basic' && <span className="badge badge-gray" style={{ justifyContent:'center', padding:'8px' }}>Actuel</span>}
                </motion.div>
                <motion.div className={`formule-card ${formuleKey==='basic'?'featured':''}`} whileHover={{ y: -4 }}>
                  <div className="formule-icon">⚡</div>
                  <div className="formule-name">Premium</div>
                  <div className="formule-price"><sup>FCFA</sup> 2 000 <span>/ mois</span></div>
                  <ul className="formule-features">
                    <li><span className="feat-check">✓</span> 50 annonces</li>
                    <li><span className="feat-check">✓</span> Badge Premium</li>
                    <li><span className="feat-check">✓</span> Mise en avant</li>
                    <li><span className="feat-check">✓</span> Statistiques</li>
                    <li><span className="feat-check">✓</span> Support prioritaire</li>
                  </ul>
                  <motion.button className="btn btn-primary btn-full" style={{ borderRadius:'var(--radius-sm)' }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowPaiement('premium')}>
                    {formuleKey === 'premium' ? '🔄 Renouveler' : '⬆️ Activer Premium'}
                  </motion.button>
                </motion.div>
                <motion.div className={`formule-card ${formuleKey==='premium'?'featured':''}`} whileHover={{ y: -4 }}>
                  <div className="formule-icon">⭐</div>
                  <div className="formule-name">Certifié</div>
                  <div className="formule-price"><sup>FCFA</sup> 5 000 <span>/ mois</span></div>
                  <ul className="formule-features">
                    <li><span className="feat-check">✓</span> 200 annonces</li>
                    <li><span className="feat-check">✓</span> Badge Certifié</li>
                    <li><span className="feat-check">✓</span> Page entreprise</li>
                    <li><span className="feat-check">✓</span> Priorité résultats</li>
                    <li><span className="feat-check">✓</span> Stats avancées</li>
                    <li><span className="feat-check">✓</span> Tout Premium +</li>
                  </ul>
                  <motion.button className="btn btn-gold btn-full" style={{ borderRadius:'var(--radius-sm)' }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowPaiement('certified')}>
                    {formuleKey === 'certified' ? '🔄 Renouveler' : '🏆 Certifier'}
                  </motion.button>
                </motion.div>
              </div>
              <div className="card-surface" style={{ marginTop: 28 }}>
                <div className="card-surface-title"><CreditCard size={18} /> Comment payer ?</div>
                <div className="payment-steps">
                  {[
                    { n:1, t:'Choisissez votre formule', d:'Cliquez sur le bouton "Activer"' },
                    { n:2, t:'Payez via Orange Money', d:'Utilisez le code USSD fourni' },
                    { n:3, t:'Envoyez la capture', d:'Photographiez le reçu et joignez-le' },
                    { n:4, t:'Activé sous 24h', d:'L\'admin valide votre abonnement' },
                  ].map(s => (
                    <div key={s.n} className="payment-step">
                      <div className="step-num">{s.n}</div>
                      <div><div className="step-title">{s.t}</div><div className="step-body">{s.d}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'profil' && (
            <div>
              <div className="section-title" style={{ marginBottom: 20 }}>
                <div className="section-title-bar" /> <User size={20} /> Informations personnelles
              </div>
              <div className="card-surface">
                <form onSubmit={saveProfile}>
                  <div className="two-col">
                    <div className="form-group">
                      <label className="form-label">Nom complet</label>
                      <input className="form-control" value={profileForm.nom||''} placeholder="Votre nom"
                        onChange={e => setProfileForm(f=>({...f,nom:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Téléphone / WhatsApp</label>
                      <input className="form-control" value={profileForm.telephone||''} placeholder="+226 XX XX XX XX"
                        onChange={e => setProfileForm(f=>({...f,telephone:e.target.value}))} />
                    </div>
                  </div>
                  <div className="two-col">
                    <div className="form-group">
                      <label className="form-label">Ville</label>
                      <input className="form-control" value={profileForm.ville||''} placeholder="Votre ville"
                        onChange={e => setProfileForm(f=>({...f,ville:e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Secteur</label>
                      <input className="form-control" value={profileForm.secteur||''} placeholder="Votre domaine"
                        onChange={e => setProfileForm(f=>({...f,secteur:e.target.value}))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bio / Description</label>
                    <textarea className="form-control" value={profileForm.bio||''} placeholder="Parlez de vous ou de votre entreprise..."
                      onChange={e => setProfileForm(f=>({...f,bio:e.target.value}))} rows={3} />
                  </div>
                  {(profile?.abonnement === 'certified' || profile?.certifie) && (
                    <div className="form-group">
                      <label className="form-label">Entreprise</label>
                      <input className="form-control" value={profileForm.entreprise_nom||''} placeholder="Nom de l'entreprise"
                        onChange={e => setProfileForm(f=>({...f,entreprise_nom:e.target.value}))} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Notifications</label>
                    <div style={{ display: 'flex', gap: 20, fontSize: 14, color: 'var(--text2)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={profileForm.notif_new_message}
                          onChange={e => setProfileForm(f=>({...f,notif_new_message:e.target.checked}))}
                          style={{ accentColor: 'var(--vert)' }} />
                        Nouveaux messages
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={profileForm.notif_livraison}
                          onChange={e => setProfileForm(f=>({...f,notif_livraison:e.target.checked}))}
                          style={{ accentColor: 'var(--vert)' }} />
                        Statut livraisons
                      </label>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:12 }}>
                    <motion.button type="submit" className="btn btn-primary"
                      disabled={saving} style={{ borderRadius:'var(--radius-sm)' }}
                      whileHover={{ scale: saving ? 1 : 1.03 }}
                      whileTap={{ scale: saving ? 1 : 0.97 }}>
                      {saving ? <><span className="btn-spinner" /> Sauvegarde...</> : '✅ Sauvegarder'}
                    </motion.button>
                  </div>
                </form>
              </div>
              <div className="card-surface">
                <div className="card-surface-title"><Settings size={18} /> Compte</div>
                <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7 }}>
                  <div><strong style={{ color: 'white' }}>Email :</strong> {user?.email}</div>
                  <div><strong style={{ color: 'white' }}>Membre depuis :</strong> {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'}</div>
                  <div><strong style={{ color: 'white' }}>Formule :</strong> {FORMULAS[formuleKey]?.name || 'Basique'}</div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {editAnnonce && (
          <AnnonceModal annonce={editAnnonce}
            onClose={() => setEditAnnonce(null)}
            onSaved={fetchAnnonces} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaiement && (
          <PaiementModal formule={showPaiement}
            onClose={() => setShowPaiement('')}
            onSuccess={() => { setShowPaiement(''); refreshProfile(); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {posterAnnonce && (
          <PosterGenerator annonce={posterAnnonce}
            onClose={() => setPosterAnnonce(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQRScanner && (
          <QRScannerModal
            onClose={() => setShowQRScanner(false)}
            onValidated={() => { setShowQRScanner(false); loadLivraisons(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}