import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { WebPush } from 'https://deno.land/x/web_push@v0.5.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;

serve(async (req) => {
  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions' }));
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      icon: `${SUPABASE_URL}/storage/v1/object/public/annonces/logokb.png`,
      badge: `${SUPABASE_URL}/storage/v1/object/public/annonces/logokb.png`,
      url: url || '/',
    });

    let sent = 0;
    for (const { subscription } of subs) {
      try {
        await WebPush.send({
          subscription,
          payload,
          vapid: {
            subject: 'mailto:contact@konabmarcket.com',
            publicKey: VAPID_PUBLIC_KEY,
            privateKey: VAPID_PRIVATE_KEY,
          },
        });
        sent++;
      } catch (e) {
        const body = typeof e === 'object' ? JSON.stringify(e) : String(e);
        if (body.includes('410') || body.includes('404')) {
          await supabase.from('push_subscriptions').delete().eq('subscription', subscription);
        }
      }
    }

    return new Response(JSON.stringify({ sent, total: subs.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
