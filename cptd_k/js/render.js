/* =========================================================
   코파일럿 타워디펜스 — 렌더러

   HUD는 캔버스 밖 DOM이라 여기서는 절대 상단을 가리지 않는다.
   캔버스 안에 글자를 얹는 것은 배너/경고처럼 짧은 것만.
   ========================================================= */

function drawBackdrop(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, CONFIG.H);
  g.addColorStop(0, '#111a33');
  g.addColorStop(1, '#0a0f20');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);

  ctx.strokeStyle = 'rgba(90,110,170,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= CONFIG.W; x += 32) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, CONFIG.H); }
  for (let y = 0; y <= CONFIG.H; y += 32) { ctx.moveTo(0, y + 0.5); ctx.lineTo(CONFIG.W, y + 0.5); }
  ctx.stroke();
}

function drawPath(ctx) {
  const pts = Game.pathPts;
  if (!pts.length) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#1b2440';
  ctx.lineWidth = 42;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  ctx.strokeStyle = '#27324f';
  ctx.lineWidth = 34;
  ctx.stroke();

  // 진행 방향 점선 — 어디서 들어와 어디로 가는지 한눈에
  ctx.save();
  ctx.strokeStyle = 'rgba(120,150,215,0.42)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 14]);
  ctx.lineDashOffset = -(Game.now / 26) % 24;
  ctx.stroke();
  ctx.restore();
}

function drawInbox(ctx) {
  const spr = SPRITES.inbox[Game.animFrame];
  ctx.drawImage(spr, INBOX.x - 24, INBOX.y - 24, 48, 48);
  ctx.font = '700 12px "Galmuri11", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = Game.inbox <= 5 ? '#ff6b6b' : '#aab6d8';
  ctx.fillText('받은편지함', INBOX.x, INBOX.y + 40);
  ctx.fillStyle = Game.inbox <= 5 ? '#ff6b6b' : '#e9eef8';
  ctx.font = '700 14px "Galmuri11", "Malgun Gothic", sans-serif';
  ctx.fillText(`${Game.inbox} / ${CONFIG.INBOX_MAX}`, INBOX.x, INBOX.y + 56);
}

function drawSpots(ctx) {
  const placing = !!Game.selectedType;
  for (let i = 0; i < Game.spots.length; i++) {
    const s = Game.spots[i];
    if (s.tower) continue;
    const cur = Game.padMode && Game.cursor === i;
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, cur ? 20 : 15, 0, Math.PI * 2);
    if (placing || cur) {
      ctx.fillStyle = cur ? 'rgba(79,195,247,0.30)' : 'rgba(79,195,247,0.13)';
      ctx.fill();
      ctx.strokeStyle = cur ? '#4fc3f7' : 'rgba(120,190,240,0.55)';
      ctx.lineWidth = cur ? 3 : 2;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(110,135,190,0.22)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawRange(ctx, x, y, r, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(79,195,247,0.07)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.restore();
}

function drawTowers(ctx) {
  const glow = Game.workIQ >= CONFIG.GLOW_FROM;
  const cw = coworkActive();
  for (const t of Game.towers) {
    const b = TOWER[t.key];
    const stunned = Game.now < t.stunUntil;

    if (glow || cw) {
      const p = (Game.workIQ - CONFIG.GLOW_FROM) / (CONFIG.WORKIQ_MAX - CONFIG.GLOW_FROM);
      const a = cw ? 0.5 : 0.12 + Math.max(0, Math.min(1, p)) * 0.3;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = cw ? '#f2c033' : b.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 4, 26 + (cw ? 5 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 육각 받침 — 적과 한눈에 구분되도록 타워에만 그린다
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      const px = t.x + Math.cos(a) * 19, py = t.y + 11 + Math.sin(a) * 8;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(8,12,26,0.85)';
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const spr = SPRITES.tower[t.key][t.flash > 0 ? 1 : Game.animFrame];
    ctx.save();
    if (stunned) ctx.globalAlpha = 0.42;
    ctx.drawImage(spr, t.x - 18, t.y - 22, 36, 36);
    ctx.restore();

    // 레벨 표시
    if (t.level > 1) {
      ctx.fillStyle = '#f2c033';
      for (let i = 0; i < t.level - 1; i++) {
        ctx.fillRect(t.x - 7 + i * 8, t.y + 15, 6, 3);
      }
    }

    if (stunned) {
      ctx.fillStyle = '#e05a5a';
      ctx.font = '700 11px "Galmuri11", "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('환각', t.x, t.y - 26);
    }
  }

  if (Game.selectedTower) {
    const t = Game.selectedTower;
    drawRange(ctx, t.x, t.y, towerStats(t).range, TOWER[t.key].color);
  }
}

function drawEnemies(ctx) {
  for (const e of Game.enemies) {
    const p = posAt(e.dist);
    const w = WORK[e.type];
    const size = e.boss ? 64 : 32;

    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + size / 2 - 3, size * 0.3, size * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    const spr = e.boss ? SPRITES.boss[Game.animFrame] : SPRITES.work[e.type][Game.animFrame];
    ctx.save();
    if (e.hit > 0) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
    }
    ctx.drawImage(spr, p.x - size / 2, p.y - size / 2, size, size);
    ctx.restore();

    if (e.boss) {
      // 층별 체력 — 왜 한 종류로는 못 깨는지 눈으로 보인다
      const bw = 116, x0 = p.x - bw / 2, y0 = p.y - 62;
      ctx.fillStyle = 'rgba(8,12,26,0.8)';
      ctx.fillRect(x0 - 4, y0 - 16, bw + 8, 48);
      WORK_KEYS.forEach((k, i) => {
        const full = WAVES[WAVE_COUNT - 1].boss.seg[k];
        const cur = Math.max(0, e.seg[k]);
        ctx.fillStyle = WORK[k].dark;
        ctx.fillRect(x0, y0 + i * 7, bw, 5);
        ctx.fillStyle = WORK[k].color;
        ctx.fillRect(x0, y0 + i * 7, bw * (cur / full), 5);
      });
      ctx.fillStyle = '#ffd6ef';
      ctx.font = '700 12px "Galmuri11", "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('분기 마감', p.x, y0 - 4);
    } else {
      const bw = 26, x0 = p.x - bw / 2, y0 = p.y - size / 2 - 7;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x0 - 1, y0 - 1, bw + 2, 5);
      ctx.fillStyle = w.color;
      ctx.fillRect(x0, y0, bw * Math.max(0, e.hp / e.maxHp), 3);
    }
  }
}

function drawShots(ctx) {
  for (const s of Game.shots) {
    const a = 1 - s.t / s.life;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.halluc ? 2 : 3;
    if (s.halluc) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawOrbs(ctx) {
  for (const o of Game.orbs) {
    const k = ORB_KINDS.find(k => k.key === o.kind) || ORB_KINDS[0];
    const fade = o.t > o.life - 2500 ? (Math.floor(o.t / 160) % 2 ? 0.35 : 1) : 1;
    const bob = Math.sin(o.t / 200) * 3;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = k.color;
    ctx.beginPath();
    ctx.arc(o.x, o.y + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.drawImage(SPRITES.orb[o.kind][Game.animFrame], o.x - 15, o.y - 15 + bob, 30, 30);
    ctx.fillStyle = k.color;
    ctx.font = '700 10px "Galmuri11", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(k.label, o.x, o.y + 26 + bob);
    ctx.restore();
  }
}

function drawChest(ctx) {
  const c = Game.chest;
  if (!c) return;
  const bob = Math.sin(c.t / 220) * 3;
  const fade = c.t > c.life - 3000 ? (Math.floor(c.t / 180) % 2 ? 0.4 : 1) : 1;
  ctx.save();
  ctx.globalAlpha = fade * 0.35;
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.arc(c.x, c.y + bob, 24 + Math.sin(c.t / 150) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.drawImage(SPRITES.chest[Game.animFrame], c.x - 18, c.y - 18 + bob, 36, 36);
  ctx.fillStyle = '#8fdcff';
  ctx.font = '700 11px "Galmuri11", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('프롬프트 상자', c.x, c.y + 30 + bob);
  ctx.restore();
}

function drawFx(ctx) {
  for (const p of Game.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.font = '700 13px "Galmuri11", "Malgun Gothic", sans-serif';
  for (const f of Game.floats) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

function drawCoworkOverlay(ctx) {
  if (!coworkActive()) return;
  const left = Game.coworkUntil - Game.now;
  ctx.save();
  ctx.globalAlpha = 0.10 + Math.sin(Game.now / 110) * 0.04;
  ctx.fillStyle = '#f2c033';
  ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#f2c033';
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, CONFIG.W - 5, CONFIG.H - 5);
  ctx.fillStyle = 'rgba(12,17,32,0.85)';
  ctx.fillRect(CONFIG.W / 2 - 130, 10, 260, 30);
  ctx.strokeStyle = '#f2c033'; ctx.lineWidth = 2;
  ctx.strokeRect(CONFIG.W / 2 - 130, 10, 260, 30);
  ctx.fillStyle = '#f2c033';
  ctx.font = '700 14px "Galmuri11", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`코워크 모드  ${(left / 1000).toFixed(1)}초`, CONFIG.W / 2, 31);
  ctx.restore();
}

function drawPhaseHint(ctx) {
  if (Game.state !== STATE.BUILD) return;
  const w = WAVES[Game.waveIndex];
  if (!w) return;
  const s = Math.max(0, Game.buildTimer / 1000);
  ctx.save();
  ctx.fillStyle = 'rgba(12,17,32,0.86)';
  ctx.fillRect(CONFIG.W / 2 - 210, CONFIG.H - 62, 420, 44);
  ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = 2;
  ctx.strokeRect(CONFIG.W / 2 - 210, CONFIG.H - 62, 420, 44);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9eef8';
  ctx.font = '700 13px "Galmuri11", "Malgun Gothic", sans-serif';
  ctx.fillText(`다음 웨이브 ${w.id} · ${w.name}`, CONFIG.W / 2, CONFIG.H - 44);
  ctx.fillStyle = '#8fdcff';
  ctx.font = '12px "Galmuri11", "Malgun Gothic", sans-serif';
  ctx.fillText(`${w.note}  —  ${s.toFixed(1)}초 후 시작 (Space로 앞당기기)`, CONFIG.W / 2, CONFIG.H - 27);
  ctx.restore();
}

function drawLowIQWarn(ctx) {
  if (Game.workIQ > CONFIG.HALLUC_IQ) return;
  if (Game.state !== STATE.WAVE && Game.state !== STATE.BUILD) return;
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(Game.now / 160) * 0.25;
  ctx.strokeStyle = '#e05a5a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, CONFIG.W - 6, CONFIG.H - 6);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = 'rgba(60,10,10,0.85)';
  ctx.fillRect(CONFIG.W / 2 - 180, 46, 360, 26);
  ctx.fillStyle = '#ff9a9a';
  ctx.font = '700 12px "Galmuri11", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('맥락 없음 — 에이전트가 환각을 일으킵니다 (오브를 주우세요)', CONFIG.W / 2, 64);
  ctx.restore();
}

function render() {
  const ctx = Game.ctx;
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  drawBackdrop(ctx);
  drawPath(ctx);
  drawInbox(ctx);
  drawSpots(ctx);

  if (Game.selectedType && Game.padMode) {
    const s = Game.spots[Game.cursor];
    if (s && !s.tower) drawRange(ctx, s.x, s.y, TOWER[Game.selectedType].range, TOWER[Game.selectedType].color);
  }

  drawTowers(ctx);
  drawEnemies(ctx);
  drawShots(ctx);
  drawOrbs(ctx);
  drawChest(ctx);
  drawFx(ctx);
  drawPhaseHint(ctx);
  drawLowIQWarn(ctx);
  drawCoworkOverlay(ctx);
}
