/* =========================================================
   Copilot World — 리더보드 (localStorage)
   ========================================================= */

const Leaderboard = (() => {
  const KEY = 'cpw_leaderboard_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function persist(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { }
  }

  function save(name, stage, score, cleared, ms) {
    if (!name) return;
    const list = load();
    const cur = list.find(r => r.name === name);
    const rec = { name, stage, score, cleared: !!cleared, ms: Math.round(ms || 0), date: new Date().toISOString() };
    if (cur) {
      const better = score > cur.score || (!cur.cleared && rec.cleared);
      if (better) Object.assign(cur, rec);
      cur.plays = (cur.plays || 1) + 1;
    } else {
      rec.plays = 1;
      list.push(rec);
    }
    list.sort((a, b) =>
      (b.cleared ? 1 : 0) - (a.cleared ? 1 : 0) || b.score - a.score || a.ms - b.ms);
    persist(list.slice(0, 100));
  }

  function top(n = 10) { return load().slice(0, n); }

  function rankOf(name) {
    const i = load().findIndex(r => r.name === name);
    return i < 0 ? null : i + 1;
  }

  function clear() { persist([]); }

  return { save, top, rankOf, clear, load };
})();

/** ms → m:ss */
function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
