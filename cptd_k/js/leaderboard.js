/* =========================================================
   코파일럿 타워디펜스 — 리더보드 (localStorage)
   부스 PC 한 대에 하루치 기록을 모으는 용도라 서버를 두지 않는다.
   ========================================================= */

const Leaderboard = (() => {
  const KEY = 'cptd_leaderboard_v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function persist(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { }
  }

  function sortList(list) {
    list.sort((a, b) =>
      (b.cleared ? 1 : 0) - (a.cleared ? 1 : 0) || b.score - a.score || a.ms - b.ms);
  }

  function save(name, wave, score, accuracy, cleared, ms) {
    if (!name) return;
    const list = load();
    const cur = list.find(r => r.name === name);
    const rec = {
      name, wave, score, accuracy: Math.round(accuracy || 0),
      cleared: !!cleared, ms: Math.round(ms || 0), date: new Date().toISOString()
    };
    if (cur) {
      // 기록 갱신은 "더 좋을 때만". 부스에서 여러 번 해도 최고 기록이 남는다.
      const better = score > cur.score || (!cur.cleared && rec.cleared);
      const plays = (cur.plays || 1) + 1;
      if (better) Object.assign(cur, rec);
      cur.plays = plays;
    } else {
      rec.plays = 1;
      list.push(rec);
    }
    sortList(list);
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
