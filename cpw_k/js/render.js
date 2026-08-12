/* =========================================================
   Copilot World — 렌더러
   ========================================================= */

const THEME_BG = {
  plain: ['#8fd0f0', '#c9ecff'],
  castle: ['#2b2440', '#4a3f6b'],
  mine: ['#241d16', '#4a3b28'],
  tower: ['#1b2340', '#38406b'],
  boss: ['#25102e', '#4d1f4a']
};

/** 배경 언덕/기둥 — 시차 스크롤 */
function drawBackdrop(ctx, W, H, theme, cam) {
  const [c1, c2] = THEME_BG[theme] || THEME_BG.plain;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const px = -cam * 0.25;

  if (theme === 'plain') {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 14; i++) {
      const x = ((i * 220 + px * 0.5) % (W + 400)) - 200;
      const y = 50 + (i % 3) * 44;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.arc(x + 26, y + 6, 20, 0, Math.PI * 2);
      ctx.arc(x - 24, y + 8, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#6bb45c';
    for (let i = 0; i < 10; i++) {
      const x = ((i * 260 + px) % (W + 520)) - 260;
      ctx.beginPath();
      ctx.moveTo(x - 130, H); ctx.lineTo(x, H - 200); ctx.lineTo(x + 130, H);
      ctx.closePath(); ctx.fill();
    }
  } else if (theme === 'castle' || theme === 'boss') {
    ctx.fillStyle = theme === 'boss' ? 'rgba(255,180,255,0.10)' : 'rgba(255,255,255,0.07)';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 190 + px) % (W + 380)) - 190;
      ctx.fillRect(x, 80, 92, H - 80);
      ctx.fillRect(x - 8, 62, 108, 20);
    }
    if (theme === 'boss') {
      ctx.fillStyle = 'rgba(255,90,160,0.10)';
      const r = 130 + Math.sin(Date.now() / 700) * 14;
      ctx.beginPath(); ctx.arc(W * 0.72, 150, r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (theme === 'mine') {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 210 + px) % (W + 420)) - 210;
      ctx.beginPath();
      ctx.moveTo(x, H); ctx.lineTo(x + 60, 120); ctx.lineTo(x + 120, H);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,220,150,0.10)';
    for (let i = 0; i < 8; i++) {
      const x = ((i * 300 + px * 1.6) % (W + 600)) - 300;
      ctx.fillRect(x, 90, 10, 26);
    }
  } else {  // tower
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97 + px * 0.4) % (W + 200)) - 100;
      const y = (i * 53) % (H * 0.6);
      const s = (i % 3) + 1;
      ctx.fillRect(x, y, s, s);
    }
    ctx.fillStyle = 'rgba(120,90,200,0.22)';
    for (let i = 0; i < 8; i++) {
      const x = ((i * 240 + px) % (W + 480)) - 240;
      ctx.fillRect(x, 130, 120, H - 130);
    }
  }
}

function render() {
  const ctx = Game.ctx;
  if (!ctx || !Game.level) return;
  const t = CONFIG.TILE;
  const W = Game.canvas.width, H = Game.canvas.height;
  const theme = Game.level.theme;
  const cam = Math.round(Game.cameraX);

  ctx.imageSmoothingEnabled = false;
  drawBackdrop(ctx, W, H, theme, cam);

  ctx.save();
  if (Game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * Game.shake, (Math.random() - 0.5) * Game.shake);
  }
  ctx.translate(-cam, 0);

  const tx0 = Math.max(0, Math.floor(cam / t) - 1);
  const tx1 = Math.min(Game.level.width - 1, Math.ceil((cam + W) / t) + 1);
  const th = SPRITES.tiles[theme] || SPRITES.tiles.plain;
  const phase = Math.floor(Date.now() / 220) % 2;

  /* ---- 타일 ---- */
  for (let ty = 0; ty < LEVEL_H; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ch = Game.tiles[ty][tx];
      if (ch === '.') continue;
      const px = tx * t, py = ty * t;
      switch (ch) {
        case '#':
          ctx.drawImage(Game.tiles[ty - 1] && Game.tiles[ty - 1][tx] === '#' ? th.ground : th.groundTop, px, py);
          break;
        case '=':
          ctx.drawImage(th.brick, px, py);
          break;
        case '?':
          ctx.drawImage(SPRITES.tiles.prompt[Game.abilities.prompt ? (Game.promptDone ? 1 : 1 + phase) : 0], px, py);
          break;
        case 'p':
          if (Game.promptDone) ctx.drawImage(SPRITES.tiles.platform, px, py);
          else {
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#4fc3f7';
            ctx.fillRect(px + 2, py + 8, t - 4, 5);
            ctx.restore();
          }
          break;
        case 'D':
          ctx.drawImage(SPRITES.tiles.data, px, py);
          break;
        case 'h':
          ctx.drawImage(SPRITES.tiles.hidden[Game.abilities.ground ? 1 : 0], px, py);
          break;
        case '^':
          ctx.drawImage(SPRITES.tiles.spike, px, py);
          break;
      }
    }
  }

  /* ---- 초안 발판 ---- */
  for (const d of Game.drafts) {
    const a = Math.min(1, d.life / 900);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#1c2c4d';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#5b8def';
    ctx.fillRect(d.x, d.y, d.w, 5);
    ctx.fillStyle = '#dce7ff';
    for (let i = 6; i < d.w - 6; i += 9) ctx.fillRect(d.x + i, d.y + 7, 5, 2);
    ctx.restore();
  }

  /* ---- 코인 ---- */
  const cphase = Math.floor(Date.now() / 110) % 4;
  for (const c of Game.coins) {
    if (c.taken) continue;
    if (c.x < cam - 40 || c.x > cam + W + 40) continue;
    ctx.drawImage(SPRITES.coin[cphase], c.x, c.y + Math.sin(Date.now() / 300 + c.x) * 2, 24, 24);
  }

  /* ---- 능력 상자 ---- */
  const box = Game.abilityBox;
  if (box && !box.taken) {
    const ab = ABILITY[box.key];
    const fy = Math.sin(Date.now() / 320) * 4;

    // 세로 전체가 획득 구간이라는 것을 눈으로 알 수 있게 빛기둥을 세운다
    const bandX = box.x - 18, bandW = 60;
    const lg = ctx.createLinearGradient(bandX, 0, bandX + bandW, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, ab.color + '55');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(bandX, 0, bandW, H);

    ctx.save();
    ctx.globalAlpha = 0.30 + Math.sin(Date.now() / 240) * 0.12;
    ctx.fillStyle = ab.color;
    ctx.beginPath();
    ctx.arc(box.x + 12, box.y + 12 + fy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(SPRITES.box[box.key][phase], box.x, box.y + fy, 26, 26);
    ctx.font = 'bold 11px "Galmuri11", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(box.x - 26, box.y - 26, 78, 17);
    ctx.fillStyle = ab.color;
    ctx.fillText(ab.name, box.x + 13, box.y - 14);
  }

  /* ---- 깃발 ---- */
  if (Game.goal) {
    ctx.drawImage(SPRITES.flag[phase], Game.goal.x, Game.goal.y, 32, 64);
  }

  /* ---- 적 ---- */
  for (const f of Game.foes) {
    if (f.dead < 0) continue;
    if (f.x < cam - 60 || f.x > cam + W + 60) continue;
    ctx.save();
    if (f.dead > 0) {
      ctx.globalAlpha = f.dead / 260;
      ctx.translate(0, (1 - f.dead / 260) * 18);
    }
    // 물러나는 중이면 반투명 — 지금은 부딪혀도 안전하다는 표시
    if (f.cooldown > 0) ctx.globalAlpha *= 0.45;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(f.x + f.w / 2, f.y + f.h - 1, f.w / 2.3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(SPRITES[f.kind][Game.animFrame], f.x - 2, f.y - 4, f.w + 4, f.h + 4);
    ctx.restore();
  }

  /* ---- 보스 ---- */
  const b = Game.boss;
  if (b && !b.dead) {
    const by = b.y + Math.sin(b.bob) * 18;
    ctx.save();
    ctx.globalAlpha = 0.26 + Math.sin(Date.now() / 200) * 0.08;
    ctx.fillStyle = '#b06cf0';
    ctx.beginPath(); ctx.arc(b.x + b.w / 2, by + b.h / 2, b.w * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    if (b.hurt > 0 && Math.floor(Date.now() / 70) % 2) ctx.globalAlpha = 0.35;
    ctx.drawImage(SPRITES.boss[Game.animFrame], b.x, by, b.w, b.h);
    ctx.restore();

    // 체력 게이지
    ctx.fillStyle = '#1a0f24';
    ctx.fillRect(b.x - 6, by - 16, b.w + 12, 9);
    ctx.fillStyle = '#e05a9a';
    ctx.fillRect(b.x - 4, by - 14, (b.w + 8) * (b.hp / b.maxHp), 5);
  }

  /* ---- 잡무 투사체 ---- */
  for (const c of Game.chores) {
    ctx.save();
    ctx.translate(c.x + 10, c.y + 10);
    ctx.rotate(Date.now() / 200);
    ctx.drawImage(SPRITES.chore, -10, -10, 20, 20);
    ctx.restore();
  }

  /* ---- 플레이어 ---- */
  const p = Game.player;
  if (p) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h - 1, p.w / 2.2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (p.dashing > 0) {
      ctx.globalAlpha = 0.35;
      for (let i = 1; i <= 3; i++) {
        ctx.drawImage(SPRITES.hero.jump[p.dir][0],
          p.x - p.dir * i * 12, p.y - 4, p.w + 6, p.h + 6);
      }
      ctx.globalAlpha = 1;
    }
    if (p.invuln > 0 && Math.floor(Date.now() / 80) % 2) ctx.globalAlpha = 0.35;
    ctx.drawImage(SPRITES.hero[p.state][p.dir][Game.animFrame], p.x - 3, p.y - 4, p.w + 6, p.h + 6);
    ctx.restore();
  }

  /* ---- 파티클 ---- */
  for (const q of Game.particles) {
    ctx.save();
    ctx.globalAlpha = q.life / q.max;
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x, q.y, 4, 4);
    ctx.restore();
  }

  /* ---- 안개 ---- */
  if (Game.level.fog && Game.level.fog.length && !Game.abilities.ground) {
    for (const [fx0, fx1] of Game.level.fog) {
      const x0 = fx0 * t, x1 = (fx1 + 1) * t;
      if (x1 < cam - 40 || x0 > cam + W + 40) continue;
      const grd = ctx.createLinearGradient(x0, 0, x0 + 90, 0);
      grd.addColorStop(0, 'rgba(18,20,34,0)');
      grd.addColorStop(1, 'rgba(18,20,34,0.96)');
      ctx.fillStyle = grd; ctx.fillRect(x0, 0, 90, H);
      ctx.fillStyle = 'rgba(18,20,34,0.96)';
      ctx.fillRect(x0 + 90, 0, Math.max(0, x1 - x0 - 180), H);
      const g2 = ctx.createLinearGradient(x1 - 90, 0, x1, 0);
      g2.addColorStop(0, 'rgba(18,20,34,0.96)');
      g2.addColorStop(1, 'rgba(18,20,34,0)');
      ctx.fillStyle = g2; ctx.fillRect(x1 - 90, 0, 90, H);
    }
    // 플레이어 주변만 겨우 보인다
    if (p) {
      const gg = ctx.createRadialGradient(p.x + p.w / 2, p.y + p.h / 2, 10, p.x + p.w / 2, p.y + p.h / 2, 78);
      gg.addColorStop(0, 'rgba(255,240,200,0.30)');
      gg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(p.x - 90, p.y - 90, 180, 180);
    }
  }

  /* ---- 플로팅 텍스트 ---- */
  ctx.textAlign = 'center';
  for (const f of Game.floats) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life / (f.max * 0.4));
    ctx.font = 'bold 14px "Galmuri11", "Malgun Gothic", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(10,10,16,0.9)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  ctx.restore();

  /* ---- 화면 고정 안내 ---- */
  if (Game.hintTimer > 0 && Game.state === STATE.PLAY) {
    const a = Math.min(1, Game.hintTimer / 700);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,12,20,0.82)';
    ctx.fillRect(W / 2 - 250, 16, 500, 38);
    ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 250, 16, 500, 38);
    ctx.fillStyle = '#e9f4ff';
    ctx.font = 'bold 14px "Galmuri11", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Game.hintText, W / 2, 40);
    ctx.restore();
  }

  if (Game.state === STATE.PAUSE) {
    ctx.fillStyle = 'rgba(8,8,14,0.7)';
    ctx.fillRect(0, 0, W, H);
  }
}
