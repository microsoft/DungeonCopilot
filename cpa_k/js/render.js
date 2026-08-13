/* =========================================================
   코파일럿 아레나 — 렌더러
   ========================================================= */

function drawArenaFloor(ctx, W, H) {
  ctx.fillStyle = '#10131f';
  ctx.fillRect(0, 0, W, H);

  // 격자 — 사무실 바닥 느낌
  ctx.strokeStyle = 'rgba(90,110,160,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = 40; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();

  // Work IQ가 높을수록 바닥이 은은하게 빛난다
  const r = workIQRatio();
  if (r > 0.02) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, `rgba(79,195,247,${0.10 * r})`);
    g.addColorStop(1, 'rgba(79,195,247,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

/** 적 — 테두리 색이 곧 필요한 도구다 */
function drawFoe(ctx, f) {
  const def = FOES[f.kind];
  const tool = TOOLS[def.tool];
  const spr = SPRITES[f.kind][Game.animFrame];
  const s = f.r * 2;

  // 필요 도구 링 — 가장 중요한 정보라 가장 눈에 띄게 그린다
  ctx.save();
  ctx.globalAlpha = f.resist > 0 ? 0.9 : 0.65;
  ctx.strokeStyle = tool.color;
  ctx.lineWidth = f.boss ? 5 : 3;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 사나워진 상태는 링이 두근거린다
  if (f.resist > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 60) * 0.15;
    ctx.fillStyle = tool.color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  if (f.flash > 0) ctx.globalAlpha = 0.55;
  ctx.drawImage(spr, f.x - s / 2, f.y - s / 2, s, s);
  ctx.restore();

  // 체력이 닳으면 막대를 보여준다
  if (f.hp < f.maxHp) {
    const w = f.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(f.x - w / 2, f.y - f.r - 12, w, 5);
    ctx.fillStyle = tool.color;
    ctx.fillRect(f.x - w / 2 + 1, f.y - f.r - 11, (w - 2) * (f.hp / f.maxHp), 3);
  }

  if (f.boss) {
    ctx.font = 'bold 12px "Galmuri11","Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd7f0';
    ctx.fillText('분기 마감', f.x, f.y - f.r - 18);
  }
}

function render() {
  const ctx = Game.ctx;
  if (!ctx) return;
  const W = CONFIG.W, H = CONFIG.H;

  ctx.imageSmoothingEnabled = false;
  drawArenaFloor(ctx, W, H);

  ctx.save();
  if (Game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * Game.shake, (Math.random() - 0.5) * Game.shake);
  }

  /* ---- 맥락 조각 ---- */
  for (const o of Game.orbs) {
    const k = ORB_KINDS[o.kind];
    const fade = Math.min(1, o.life / 1400);
    const pulse = 1 + Math.sin(Date.now() / 220 + o.x) * 0.12;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = k.color;
    ctx.globalAlpha = fade * 0.22;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * 2.1 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#0e1424';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = k.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(k.icon, o.x, o.y + 1);
    ctx.restore();
  }

  /* ---- 프롬프트 상자 ---- */
  for (const c of Game.chests) {
    const fade = Math.min(1, c.life / 1600);
    const bob = Math.sin(Date.now() / 300) * 3;
    ctx.save();
    ctx.globalAlpha = fade * (0.3 + Math.sin(Date.now() / 180) * 0.12);
    ctx.fillStyle = '#f2c033';
    ctx.beginPath();
    ctx.arc(c.x, c.y + bob, c.r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#1b1a0e';
    ctx.fillRect(c.x - c.r, c.y - c.r + bob, c.r * 2, c.r * 2);
    ctx.strokeStyle = '#f2c033';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x - c.r, c.y - c.r + bob, c.r * 2, c.r * 2);
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2c033';
    ctx.fillText('?', c.x, c.y + bob + 1);
    ctx.font = 'bold 10px "Galmuri11","Malgun Gothic",sans-serif';
    ctx.fillText('보너스', c.x, c.y + c.r + 10 + bob);
    ctx.restore();
  }

  /* ---- 적 ---- */
  for (const f of Game.foes) drawFoe(ctx, f);

  /* ---- 탄 ---- */
  for (const s of Game.shots) {
    const t = TOOLS[s.tool];
    ctx.save();
    if (s.halluc) {
      // 환각은 색이 빠지고 흔들린다
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#8a8fa8';
      ctx.beginPath();
      ctx.arc(s.x + (Math.random() - 0.5) * 4, s.y + (Math.random() - 0.5) * 4, s.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x - 1, s.y - 1, s.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---- 플레이어 ---- */
  const p = Game.player;
  if (p) {
    const tool = TOOLS[Game.tool];

    // 지금 든 도구를 몸에 두른다 — 항상 보이게
    ctx.save();
    ctx.globalAlpha = 0.30 + Math.sin(Date.now() / 260) * 0.08;
    ctx.strokeStyle = tool.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (Game.cowork > 0) {
      // 코워크 — 에이전트 3기가 돈다
      for (let i = 0; i < 3; i++) {
        const a = Date.now() / 300 + (i * Math.PI * 2) / 3;
        const ax = p.x + Math.cos(a) * 34, ay = p.y + Math.sin(a) * 34;
        const c = [TOOLS.analyze, TOOLS.draft, TOOLS.ground][i].color;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(ax, ay, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    if (p.invuln > 0 && Math.floor(Date.now() / 80) % 2) ctx.globalAlpha = 0.35;
    const s = p.r * 2.2;
    ctx.drawImage(SPRITES.hero[p.moving ? Game.animFrame : 0], p.x - s / 2, p.y - s / 2, s, s);
    ctx.restore();
  }

  /* ---- 파티클 ---- */
  for (const q of Game.particles) {
    ctx.save();
    ctx.globalAlpha = q.life / q.max;
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
    ctx.restore();
  }

  /* ---- 떠오르는 글자 ---- */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const f of Game.floats) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life / (f.max * 0.4));
    ctx.font = 'bold 14px "Galmuri11","Malgun Gothic",sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8,10,18,0.9)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  ctx.restore();

  /* ---- 화면 고정 안내 ---- */
  if (Game.tipTimer > 0 && Game.state === STATE.PLAY) {
    const a = Math.min(1, Game.tipTimer / 700);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,12,20,0.85)';
    ctx.fillRect(W / 2 - 250, 12, 500, 34);
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 250, 12, 500, 34);
    ctx.fillStyle = '#e9f4ff';
    ctx.font = 'bold 14px "Galmuri11","Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Game.tipText, W / 2, 34);
    ctx.restore();
  }

  /* ---- 맥락이 바닥나면 경고 ---- */
  if (Game.workIQ <= 0 && Game.state === STATE.PLAY && Game.cowork <= 0) {
    ctx.save();
    ctx.globalAlpha = 0.30 + Math.sin(Date.now() / 200) * 0.15;
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 13px "Galmuri11","Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('맥락 없음 — 환각 발생 중. 조각을 주우세요', W / 2, H - 14);
    ctx.restore();
  }

  if (Game.state === STATE.PAUSE) {
    ctx.fillStyle = 'rgba(8,8,14,0.7)';
    ctx.fillRect(0, 0, W, H);
  }
}
