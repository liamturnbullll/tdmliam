import { createClient } from '@supabase/supabase-js';

// Shared backend for the equipment hub — replaces the per-device IndexedDB
// polyfill so every user (owner, Head of Equipment, gym managers) reads and
// writes the same live data. Keeps the same get/set/delete({value}) shape
// App.jsx's loadKey/saveKey/deleteKey already expect, plus a subscribe()
// for realtime pushes when another client changes a key.

const SUPABASE_URL = 'https://ligsxiukkshuynwgghhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable__zRyOzAEtdD8attKxwAizg_8zLgOEPo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const storage = {
  async get(key) {
    const { data, error } = await supabase.from('kv_store').select('value').eq('key', key).maybeSingle();
    if (error || !data) return null;
    return { value: JSON.stringify(data.value) };
  },
  async set(key, value) {
    await supabase.from('kv_store').upsert({ key, value: JSON.parse(value), updated_at: new Date().toISOString() });
  },
  async delete(key) {
    await supabase.from('kv_store').delete().eq('key', key);
  },
  subscribe(key, onChange) {
    const channel = supabase
      .channel(`kv_store:${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store', filter: `key=eq.${key}` }, (payload) => {
        if (payload.new && payload.new.value !== undefined) onChange(payload.new.value);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }
};
