import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

const NotifContext = createContext();

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(660, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (_) {}
}

export function NotifProvider({ children, addToast }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const channelRef = useRef(null);
  const lastSoundRef = useRef(0);

  const fetchNotifs = useCallback(async () => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.lu).length);
    }
  }, [user]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('notifications-realtime', {
      config: { broadcast: { self: true } },
    });
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`,
    }, (payload) => {
      const notif = payload.new;
      setNotifications(prev => [notif, ...prev]);
      if (!notif.lu) setUnreadCount(prev => prev + 1);
      const now = Date.now();
      if (now - lastSoundRef.current > 2000) {
        playNotifSound();
        lastSoundRef.current = now;
      }
      if (addToast) addToast(notif.body || notif.title, notif.type === 'livraison' ? 'success' : 'info');
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [user, addToast]);

  async function markAsRead(notifId) {
    await supabase.from('notifications').update({ lu: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    if (!user || notifications.length === 0) return;
    await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id).eq('lu', false);
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    setUnreadCount(0);
  }

  async function addNotif(notif) {
    if (!user) return;
    const { data } = await supabase.from('notifications').insert({
      user_id: user.id,
      type: notif.type,
      title: notif.title,
      body: notif.body || '',
      data: notif.data || {},
    }).select().single();
    if (data) {
      setNotifications(prev => [data, ...prev]);
      if (!data.lu) setUnreadCount(prev => prev + 1);
      playNotifSound();
    }
  }

  return (
    <NotifContext.Provider value={{
      notifications, unreadCount, showPanel,
      setShowPanel, markAsRead, markAllRead, addNotif, fetchNotifs,
    }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}