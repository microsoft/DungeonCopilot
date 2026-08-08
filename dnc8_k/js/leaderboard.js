/* =========================================================
   던전앤코파일럿 8 — 리더보드 (localStorage)
   ========================================================= */

const Leaderboard = (() => {
  const KEY = 'dnc8_leaderboard_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function persist(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { }
  }

  function save(name, stage, points) {
    const list = load();
    const existing = list.find(r => r.name === name);
    if (existing) {
      // 개인 최고 기록만 갱신
      if (stage > existing.stage || (stage === existing.stage && points > existing.points)) {
        existing.stage = stage;
        existing.points = points;
        existing.date = new Date().toISOString();
      }
      existing.plays = (existing.plays || 1) + 1;
    } else {
      list.push({
        name, stage, points, plays: 1,
        date: new Date().toISOString()
      });
    }
    list.sort((a, b) => b.stage - a.stage || b.points - a.points);
    persist(list.slice(0, 100));
  }

  function top(n = 10) { return load().slice(0, n); }

  function rankOf(name) {
    const list = load();
    const i = list.findIndex(r => r.name === name);
    return i < 0 ? null : i + 1;
  }

  function clear() { persist([]); }

  return { save, top, rankOf, clear, load };
})();
