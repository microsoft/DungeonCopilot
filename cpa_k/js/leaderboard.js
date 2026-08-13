/* =========================================================
   코파일럿 아레나 — 리더보드 (localStorage)
   ========================================================= */

const Leaderboard = (() => {
  const KEY = 'cpa_leaderboard_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function persist(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { }
  }

  function save(name, score, wave, cleared, acc) {
    if (!name) return;
    const list = load();
    const cur = list.find(r => r.name === name);
    const rec = {
      name, score, wave, cleared: !!cleared,
      acc: Math.round(acc || 0),
      date: new Date().toISOString()
    };
    if (cur) {
      if (score > cur.score) Object.assign(cur, rec);
      cur.plays = (cur.plays || 1) + 1;
    } else {
      rec.plays = 1;
      list.push(rec);
    }
    list.sort((a, b) => b.score - a.score);
    persist(list.slice(0, 100));
  }

  function top(n = 8) { return load().slice(0, n); }

  function rankOf(name) {
    const i = load().findIndex(r => r.name === name);
    return i < 0 ? null : i + 1;
  }

  function clear() { persist([]); }

  return { save, top, rankOf, clear, load };
})();
