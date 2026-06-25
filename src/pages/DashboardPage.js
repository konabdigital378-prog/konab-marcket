import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Package, TrendingUp, Crown, User, Settings, LogOut, Plus, Sparkles, CreditCard, BarChart3, Edit3, Trash2, ChevronRight } from 'lucide-react';
import { supabase, FORMULAS } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { AnnonceCard } from '../components/AnnonceCard';
import { SkeletonCards } from '../components/Skeleton';
import { toast } from '../components/Toast';
import AnnonceModal from '../components/AnnonceModal';
import PaiementModal from '../components/PaiementModal';

export default function DashboardPage({ onShowCreate }) {
  const { user, profile, refreshProfile, maxAnnonces } = useAuth();
  const [tab, setTab] = useState('annonces');
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editAnnonce, setEditAnnonce] = useState(null);
  const [showPaiement, setShowPaiement] = useState('');
  const [profileForm, setProfileForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setProfileForm({ nom: profile.nom||'', telephone: profile.telephone||'', ville: profile.ville||'', secteur: profile.secteur||'', entreprise_nom: profile.entreprise_nom||'' });
  }, [profile]);

  const fetchAnnonces = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('annonces').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAnnonces(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAnnonces(); }, [fetchAnnonces]);

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

  const canCreate  = annonces.filter(a => a.actif).length < maxAnnonces();
  const formuleKey = profile?.abonnement || 'basic';
  const expDate    = profile?.abonnement_expire ? new Date(profile.abonnement_expire).toLocaleDateString('fr-FR') : null;
  const initials   = (profile?.nom || user?.email || 'U').slice(0, 2).toUpperCase();
  const totalVues  = annonces.reduce((sum, a) => sum + (a.vues || 0), 0);

  const tabs = [
    { id: 'annonces', label: 'Mes annonces', icon: <Package size={16} /> },
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
          <TrendingUp size={20} style={{ color: 'white', margin: '0 auto 8px' }} />
          <div className="stat-num blanc">{totalVues}</div>
          <div className="stat-label">Vues totales</div>
        </div>
        <div className="stat-card">
          <Crown size={20} style={{ color: 'var(--or)', margin: '0 auto 8px' }} />
          <div className="stat-num or">{maxAnnonces()}</div>
          <div className="stat-label">Limite</div>
        </div>
      </motion.div>

      <div className="tabs">
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
                {canCreate
                  ? <motion.button className="btn btn-primary" onClick={onShowCreate || (() => {})}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    >
                      <Plus size={16} /> Nouvelle annonce
                    </motion.button>
                  : <span className="badge badge-danger">⚠️ Limite atteinte</span>
                }
              </div>

              {!canCreate && (
                <div className="alert alert-warning">
                  ⚠️ Vous avez atteint la limite de {maxAnnonces()} annonces.
                  <button onClick={() => setTab('abonnement')} style={{ background:'none', border:'none', color:'var(--vert)', fontWeight:800, cursor:'pointer', marginLeft:8 }}>
                    Upgrader →
                  </button>
                </div>
              )}

              {loading ? <SkeletonCards count={3} />
              : annonces.length === 0 ? (
                <div className="empty-state">
                  <div className="icon"><Package size={60} style={{ color: 'var(--text3)' }} /></div>
                  <h3>Aucune annonce publiée</h3>
                  <p>Publiez votre première annonce et commencez à recevoir des contacts !</p>
                  <motion.button className="btn btn-primary btn-lg" onClick={onShowCreate || (() => {})}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  >
                    <Plus size={18} /> Créer ma première annonce
                  </motion.button>
                </div>
              ) : (
                <div className="cards-grid">
                  {annonces.map(a => (
                    <AnnonceCard key={a.id} annonce={a} isOwner
                      onEdit={a => setEditAnnonce(a)} onDelete={deleteAnnonce} />
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
                <motion.div className="formule-card"
                  whileHover={{ y: -4 }}
                >
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

                <motion.div className={`formule-card ${formuleKey==='basic'?'featured':''}`}
                  whileHover={{ y: -4 }}
                >
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
                  <motion.button className="btn btn-primary btn-full"
                    style={{ borderRadius:'var(--radius-sm)' }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowPaiement('premium')}>
                    {formuleKey === 'premium' ? '🔄 Renouveler' : '⬆️ Activer Premium'}
                  </motion.button>
                </motion.div>

                <motion.div className={`formule-card ${formuleKey==='premium'?'featured':''}`}
                  whileHover={{ y: -4 }}
                >
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
                  <motion.button className="btn btn-gold btn-full"
                    style={{ borderRadius:'var(--radius-sm)' }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
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
                  {(profile?.abonnement === 'certified' || profile?.certifie) && (
                    <div className="form-group">
                      <label className="form-label">Entreprise</label>
                      <input className="form-control" value={profileForm.entreprise_nom||''} placeholder="Nom de l'entreprise"
                        onChange={e => setProfileForm(f=>({...f,entreprise_nom:e.target.value}))} />
                    </div>
                  )}
                  <div style={{ display:'flex', gap:12 }}>
                    <motion.button type="submit" className="btn btn-primary"
                      disabled={saving} style={{ borderRadius:'var(--radius-sm)' }}
                      whileHover={{ scale: saving ? 1 : 1.03 }}
                      whileTap={{ scale: saving ? 1 : 0.97 }}
                    >
                      {saving
                        ? <span style={{display:'flex',alignItems:'center',gap:8}}><span className="btn-spinner" /> Sauvegarde...</span>
                        : '✅ Sauvegarder'
                      }
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
    </div>
  );
}
