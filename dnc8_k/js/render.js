/* =========================================================
   던전앤코파일럿 8 — 렌더러
   ========================================================= */

function render() {
  const ctx = Game.ctx;
  if (!ctx) return;
  const T = CONFIG.TILE;
  const W = Game.canvas.width, H = Game.canvas.height;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#16120c';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (Game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * Game.shake, (Math.random() - 0.5) * Game.shake);
  }

  if (!Game.walls) { ctx.restore(); return; }

  /* ---- 바닥 & 벽 ---- */
  for (let y = 0; y < CONFIG.GRID; y++) {
    for (let x = 0; x < CONFIG.GRID; x++) {
      const px = x * T, py = y * T;
      if (Game.walls[y][x] === 1) {
        ctx.drawImage(SPRITES.wall, px, py, T, T);
      } else {
        const v = (x * 7 + y * 13) % 4;
        ctx.drawImage(SPRITES.floor[v], px, py, T, T);
      }
    }
  }

  /* ---- 클릭 이동 목적지 표시 ---- */
  if (Game.autoTarget && Game.autoPath) {
    const t = Game.autoTarget;
    const age = (performance.now() - t.t) / 1000;
    const pulse = 6 + Math.sin(age * 8) * 2;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = '#f0b429';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    // 십자 표식 — 원만으로는 바닥 무늬에 묻힌다
    ctx.beginPath();
    ctx.moveTo(t.x - 10, t.y); ctx.lineTo(t.x - 5, t.y);
    ctx.moveTo(t.x + 5, t.y);  ctx.lineTo(t.x + 10, t.y);
    ctx.moveTo(t.x, t.y - 10); ctx.lineTo(t.x, t.y - 5);
    ctx.moveTo(t.x, t.y + 5);  ctx.lineTo(t.x, t.y + 10);
    ctx.stroke();
    ctx.restore();
  }

  /* ---- 포털 ---- */
  if (Game.portalOpen && Game.portal) {
    const ph = Math.floor(Date.now() / 160) % 3;
    const glow = 0.35 + Math.sin(Date.now() / 200) * 0.15;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = PAL.portalA;
    ctx.beginPath();
    ctx.arc(Game.portal.x + 16, Game.portal.y + 16, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(SPRITES.portal[ph], Game.portal.x, Game.portal.y, T, T);
  }

  /* ---- 몬스터 ---- */
  for (const m of Game.monsters) {
    const spr = SPRITES[m.tier][Game.animFrame];
    const cfg = CONFIG.TIER[m.tier];

    // 그림자
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(m.x + m.size / 2, m.y + m.size - 1, m.size / 2.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 상급은 오라
    if (m.tier === 'high') {
      ctx.save();
      ctx.globalAlpha = 0.20 + Math.sin(Date.now() / 180) * 0.08;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(m.x + m.size / 2, m.y + m.size / 2, m.size * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 리스폰 반짝임
    if (m.spawnFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (m.spawnFlash / 400) * 0.8;
      ctx.fillStyle = '#fff';
      ctx.fillRect(m.x - 2, m.y - 2, m.size + 4, m.size + 4);
      ctx.restore();
    }

    // 쿨다운 중이면 반투명
    ctx.save();
    if (m.cooldown > 0) ctx.globalAlpha = 0.45;
    const md = 6; // 히트박스보다 크게 그려 식별성 향상
    ctx.drawImage(spr, m.x - md / 2, m.y - md, m.size + md, m.size + md);
    ctx.restore();

    // 등급 표시 점
    ctx.fillStyle = cfg.color;
    const dots = m.tier === 'high' ? 3 : m.tier === 'mid' ? 2 : 1;
    for (let i = 0; i < dots; i++) {
      ctx.fillRect(m.x + m.size / 2 - dots * 2 + i * 4, m.y - 10, 3, 3);
    }
  }

  /* ---- 플레이어 ---- */
  const p = Game.player;
  if (p) {
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(p.x + p.size / 2, p.y + p.size - 1, p.size / 2.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const frame = p.walking ? Game.animFrame : 0;
    ctx.save();
    if (p.invuln > 0 && Math.floor(Date.now() / 90) % 2) ctx.globalAlpha = 0.4;
    // 플레이어 식별용 은은한 발광
    ctx.globalAlpha *= 1;
    const pg = ctx.createRadialGradient(
      p.x + p.size / 2, p.y + p.size / 2, 4,
      p.x + p.size / 2, p.y + p.size / 2, 26);
    pg.addColorStop(0, 'rgba(255,236,170,0.30)');
    pg.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(p.x - 16, p.y - 16, p.size + 32, p.size + 32);

    const pd = 8;
    ctx.drawImage(SPRITES.warrior[p.dir][frame], p.x - pd / 2, p.y - pd, p.size + pd, p.size + pd);
    ctx.restore();
  }

  /* ---- 어둠(비네트) ---- */
  if (p) {
    const cx = p.x + p.size / 2, cy = p.y + p.size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, W * 0.62);
    grad.addColorStop(0, 'rgba(10,7,4,0)');
    grad.addColorStop(0.55, 'rgba(10,7,4,0.28)');
    grad.addColorStop(1, 'rgba(10,7,4,0.80)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---- 플로팅 텍스트 ---- */
  ctx.textAlign = 'center';
  for (const f of Game.floatTexts) {
    const a = Math.min(1, f.life / (f.maxLife * 0.4));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 15px "Press Start 2P", monospace';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0d0a06';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  /* ---- 일시정지 시 화면을 어둡게 ---- */
  if (Game.state === STATE.PAUSE) {
    ctx.fillStyle = 'rgba(11,8,5,0.66)';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}
