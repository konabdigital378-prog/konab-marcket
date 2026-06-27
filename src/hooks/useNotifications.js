import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { subscribeToPush, requestPushPermission, unsubscribeFromPush, registerPushSW } from '../utils/push';

const NotifContext = createContext();

function playNotifSound() {
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

    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1100, now + 0.08);
    osc1.frequency.setValueAtTime(880, now + 0.16);
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(550, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.setValueAtTime(0.3, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now);
    osc2.stop(now + 0.35);
  } catch (_) {}
}

function playRemoteSound(url) {
  try {
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.play().catch(() => {});
    setTimeout(() => { audio.src = ''; }, 5000);
  } catch (_) {}
}

function syncBadgeToSW(count) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: count > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
      count,
    });
  }
}

function setAppBadge(count) {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.setAppBadge(0).catch(() => {});
      }
    }
  } catch (_) {}
}

export function NotifProvider({ children, addToast }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [pushStatus, setPushStatus] = useState('checking');
  const channelRef = useRef(null);
  const lastSoundRef = useRef(0);
  const unreadCountRef = useRef(0);

  const updateBadge = useCallback((count) => {
    syncBadgeToSW(count);
    setAppBadge(count);
  }, []);

  const fetchNotifs = useCallback(async () => {
    if (!user) { setNotifications([]); setUnreadCount(0); updateBadge(0); return; }
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      const unread = data.filter(n => !n.lu).length;
      setNotifications(data);
      setUnreadCount(unread);
      unreadCountRef.current = unread;
      updateBadge(unread);
    }
  }, [user, updateBadge]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!user) return;
    registerPushSW().then(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        subscribeToPush(user.id);
      }
    });
  }, [user]);

  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'PLAY_NOTIF_SOUND') {
        playRemoteSound(event.data.url);
      }
      if (event.data?.type === 'CLEAR_BADGE') {
        setUnreadCount(0);
        unreadCountRef.current = 0;
        updateBadge(0);
        fetchNotifs();
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, [fetchNotifs, updateBadge]);

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
      if (!notif.lu) {
        const newCount = unreadCountRef.current + 1;
        setUnreadCount(newCount);
        unreadCountRef.current = newCount;
        updateBadge(newCount);
      }
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
  }, [user, addToast, updateBadge]);

  async function markAsRead(notifId) {
    await supabase.from('notifications').update({ lu: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lu: true } : n));
    const newCount = Math.max(0, unreadCountRef.current - 1);
    setUnreadCount(newCount);
    unreadCountRef.current = newCount;
    updateBadge(newCount);
  }

  async function markAllRead() {
    if (!user || notifications.length === 0) return;
    await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id).eq('lu', false);
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    setUnreadCount(0);
    unreadCountRef.current = 0;
    updateBadge(0);
  }

  useEffect(() => {
    if (!('Notification' in window)) { setPushStatus('unsupported'); return; }
    setPushStatus(Notification.permission);
  }, []);

  async function enablePush() {
    if (!user) return;
    const result = await requestPushPermission(user.id);
    setPushStatus(result);
    return result;
  }

  async function disablePush() {
    await unsubscribeFromPush(user?.id);
    setPushStatus('denied');
    updateBadge(0);
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
      if (!data.lu) {
        const newCount = unreadCountRef.current + 1;
        setUnreadCount(newCount);
        unreadCountRef.current = newCount;
        updateBadge(newCount);
      }
      playNotifSound();
    }
  }

  return (
    <NotifContext.Provider value={{
      notifications, unreadCount, showPanel, pushStatus,
      setShowPanel, markAsRead, markAllRead, addNotif, fetchNotifs,
      enablePush, disablePush,
    }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
