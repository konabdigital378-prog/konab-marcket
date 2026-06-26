import { motion } from 'framer-motion';
import { Bell, MessageCircle, Truck, TrendingUp, Flag, Crown, CheckCheck, ShoppingBag, BellOff, BellRing } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const TYPE_ICONS = {
  message: <MessageCircle size={16} />,
  livraison: <Truck size={16} />,
  offre: <TrendingUp size={16} />,
  signalement: <Flag size={16} />,
  abonnement: <Crown size={16} />,
  system: <ShoppingBag size={16} />,
};

const TYPE_COLORS = {
  message: 'var(--vert)',
  livraison: 'var(--or)',
  offre: 'var(--orange)',
  signalement: 'var(--danger)',
  abonnement: 'var(--vert)',
  system: 'var(--text2)',
};

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllRead, pushStatus, enablePush, disablePush } = useNotifications();

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onClick={onClose} />
      <motion.div className="dropdown-menu"
        style={{ right: 60, top: 'calc(100% + 10px)', minWidth: 320, maxWidth: 380, maxHeight: 420, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'white' }}>
            <Bell size={16} style={{ display: 'inline', marginRight: 8 }} />
            Notifications
            {unreadCount > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: 10 }}>{unreadCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {pushStatus !== 'unsupported' && (
              <motion.button
                className="btn btn-sm"
                style={{
                  background: pushStatus === 'granted' ? 'rgba(57,211,83,0.1)' : 'rgba(255,255,255,0.05)',
                  color: pushStatus === 'granted' ? 'var(--vert)' : 'var(--text3)',
                  borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 10, whiteSpace: 'nowrap',
                }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => pushStatus === 'granted' ? disablePush() : enablePush()}
                title={pushStatus === 'granted' ? 'Notifications push activées' : 'Activer les notifications push'}
              >
                {pushStatus === 'granted' ? <BellRing size={12} style={{ marginRight: 3, display: 'inline' }} /> : <BellOff size={12} style={{ marginRight: 3, display: 'inline' }} />}
                Push {pushStatus === 'granted' ? 'ON' : pushStatus === 'denied' ? 'OFF' : 'OFF'}
              </motion.button>
            )}
            {unreadCount > 0 && (
              <motion.button className="btn btn-sm"
                style={{ background: 'rgba(57,211,83,0.1)', color: 'var(--vert)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', fontSize: 11 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={markAllRead}>
                <CheckCheck size={12} /> Tout lu
              </motion.button>
            )}
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              <Bell size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              Aucune notification
            </div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <div key={n.id}
                onClick={() => !n.lu && markAsRead(n.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: n.lu ? 'transparent' : 'rgba(57,211,83,0.04)',
                  transition: 'background 0.15s',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = n.lu ? 'transparent' : 'rgba(57,211,83,0.04)'}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `${TYPE_COLORS[n.type] || 'var(--text3)'}15`,
                  color: TYPE_COLORS[n.type] || 'var(--text3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {TYPE_ICONS[n.type] || <Bell size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'white', marginBottom: 2 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{n.body}</div>}
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!n.lu && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--vert)', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}

export function NotifBell() {
  const { unreadCount, showPanel, setShowPanel } = useNotifications();
  return (
    <button className="nav-icon-btn notif-bell" onClick={() => setShowPanel(!showPanel)} title="Notifications">
      <Bell size={16} />
      {unreadCount > 0 && <span className="notif-bell-dot" />}
    </button>
  );
}