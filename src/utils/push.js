import { supabase } from '../supabase';

const VAPID_PUBLIC_KEY = 'BB1rCmEWBQAPgyHi7lPpIs7Koa89jiozWbKjwqGPAk76j6b--r5PeHpfdlbady3abWK7dLm1jbPHCv72-iPBnDQ';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export async function registerPushSW() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg;
  } catch (_) { return null; }
}

export async function getPushSubscription() {
  const reg = await registerPushSW();
  if (!reg) return null;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (_) { return null; }
  }
  return sub;
}

export async function subscribeToPush(userId) {
  if (!userId || !('PushManager' in window)) return false;
  try {
    const sub = await getPushSubscription();
    if (!sub) return false;
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: sub.toJSON(),
      user_agent: navigator.userAgent,
    }, { onConflict: 'user_id,subscription', ignoreDuplicates: false });
    return !error;
  } catch (_) { return false; }
}

export async function unsubscribeFromPush(userId) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  } catch (_) {}
}

export async function requestPushPermission(userId) {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') {
    await subscribeToPush(userId);
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  if (result === 'granted') await subscribeToPush(userId);
  return result;
}
