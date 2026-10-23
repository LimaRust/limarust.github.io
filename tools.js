/* Raid and farming calculators. The numbers come from the running game (raid.json, wiki.json), see tools/site-data/build.mjs. */
(function () {
  'use strict';
  const T = (ru, en) => (LANG === 'en' ? en : ru);
  const D = { raid: null, failed: false, loading: false };
  const S = {
    tab: 'raid', target: 'tier:stone', qty: 1, tool: 'hatchet', toolQty: 1, decayH: 2, codeN: 10, codeHot: true, codeMine: '',
    mine: 'quarry', res: 'stones', hours: 8, genes: ['', '', '', '', '', '', '', ''], rate: 1,
  };
  let tried = [], batch = [];
  try { tried = JSON.parse(localStorage.getItem('lima.codes') || '[]'); } catch (e) { tried = []; }
  const saveTried = () => { try { localStorage.setItem('lima.codes', JSON.stringify(tried)); } catch (e) { /* private mode */ } };

  const TABS = [
    ['raid', 'Рейд', 'Raid'], ['eco', 'Эко-рейд', 'Eco raid'], ['wall', 'Стена и инструмент', 'Wall and tool'], ['decay', 'Гниение', 'Decay'],
    ['codes', 'Коды замков', 'Door codes'], ['mine', 'Карьер, насос, экскаватор', 'Quarry, pump, excavator'], ['genes', 'Гены растений', 'Plant genes'],
  ];
  const TIER = { twig: ['Солома', 'Twig'], wood: ['Дерево', 'Wood'], stone: ['Камень', 'Stone'], metal: ['Листовой металл', 'Sheet metal'], toptier: ['Бронированный (МВК)', 'Armored'] };
  const DOOR = {
    'door.wood': ['Деревянная дверь', 'Wooden door'], 'door.metal': ['Металлическая дверь', 'Sheet metal door'], 'door.armored': ['Бронированная дверь', 'Armored door'],
    'door.double.wood': ['Двойная деревянная дверь', 'Double wooden door'], 'door.double.metal': ['Двойная металлическая дверь', 'Double metal door'],
    'door.double.armored': ['Двойная бронированная дверь', 'Double armored door'], garage: ['Гаражная дверь', 'Garage door'],
    'wall.high.wood': ['Высокая деревянная стена', 'High wooden wall'], 'wall.high.stone': ['Высокая каменная стена', 'High stone wall'],
    'gate.high.wood': ['Деревянные ворота', 'Wooden gate'], 'gate.high.stone': ['Каменные ворота', 'Stone gate'], 'ladder.hatch': ['Люк с лестницей', 'Ladder hatch'],
    shutters: ['Ставни', 'Shutters'], 'window.bars.metal': ['Металлическая решётка', 'Metal window bars'], 'window.glass': ['Укреплённое стекло', 'Reinforced glass'],
    'wall.frame.cell': ['Решётчатая камера', 'Prison cell wall'], 'box.wood.large': ['Большой ящик', 'Large box'], cupboard: ['Шкаф (TC)', 'Tool cupboard'],
  };
  const WEAP = {
    'explosive.timed': ['C4', 'C4'], 'explosive.satchel': ['Сумка со взрывчаткой', 'Satchel charge'], 'ammo.rocket.basic': ['Ракета', 'Rocket'],
    'ammo.rocket.hv': ['Скоростная ракета', 'HV rocket'], 'ammo.rocket.fire': ['Зажигательная ракета', 'Incendiary rocket'], 'grenade.beancan': ['Бобовая граната', 'Beancan grenade'],
    'grenade.f1': ['Граната Ф1', 'F1 grenade'], 'ammo.grenadelauncher.he': ['Граната 40 мм (HE)', '40mm HE grenade'],
  };
  const TOOL = {
    rock: ['Камень', 'Rock'], stonehatchet: ['Каменный топор', 'Stone hatchet'], 'stone.pickaxe': ['Каменная кирка', 'Stone pickaxe'], hatchet: ['Топор', 'Hatchet'],
    pickaxe: ['Кирка', 'Pick axe'], 'axe.salvaged': ['Топор из металлолома', 'Salvaged axe'], 'icepick.salvaged': ['Ледоруб из металлолома', 'Salvaged icepick'],
    'hammer.salvaged': ['Молот из металлолома', 'Salvaged hammer'], machete: ['Мачете', 'Machete'], mace: ['Булава', 'Mace'], longsword: ['Длинный меч', 'Longsword'],
    'salvaged.sword': ['Меч из металлолома', 'Salvaged sword'], 'bone.club': ['Костяная дубина', 'Bone club'], 'spear.wooden': ['Деревянное копьё', 'Wooden spear'],
    'spear.stone': ['Каменное копьё', 'Stone spear'], 'knife.combat': ['Боевой нож', 'Combat knife'], 'knife.bone': ['Костяной нож', 'Bone knife'], pitchfork: ['Вилы', 'Pitchfork'],
    sickle: ['Серп', 'Sickle'], paddle: ['Весло', 'Paddle'],
  };
  const RES = {
    stones: ['Камень', 'Stone'], 'metal.ore': ['Металлическая руда', 'Metal ore'], 'sulfur.ore': ['Серная руда', 'Sulfur ore'], 'hq.metal.ore': ['МВК руда', 'HQM ore'], 'crude.oil': ['Нефть', 'Crude oil'],
    'metal.fragments': ['Металлические фрагменты', 'Metal fragments'],
  };
  const nm = (map, id) => (map[id] ? T(map[id][0], map[id][1]) : (WK.by[id] ? WK.by[id].n : id));
  const itemName = (id) => (WK.by[id] ? WK.by[id].n : id);
  const icon = (id) => '<img src="' + itemIc(id) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  const num = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU') : '∞');
  const fmtTime = (s) => { s = Math.round(s); if (s < 60) return s + ' ' + T('с', 's'); const m = Math.floor(s / 60); if (m < 60) return m + ' ' + T('мин', 'min') + (s % 60 ? ' ' + (s % 60) + ' ' + T('с', 's') : ''); return Math.floor(m / 60) + ' ' + T('ч', 'h') + ' ' + (m % 60) + ' ' + T('мин', 'min'); };

  /* ---------- data ---------- */
  async function boot() {
    if (D.raid || D.loading) return;
    D.loading = true;
    try {
      D.raid = await (await fetch('raid.json')).json();
      if (!WK.data) await loadWiki();
      if (!WK.data || !WK.data.length) throw new Error('wiki');
    } catch (e) { D.failed = true; }
    D.loading = false;
    draw();
  }

  function targets() {
    const list = D.raid.tiers.map((t) => ({ id: 'tier:' + t.id, g: T('Стены, полы, потолки', 'Walls, floors, roofs'), n: nm(TIER, t.id), hp: t.hp, prot: t.prot }));
    D.raid.doors.forEach((d) => list.push({ id: 'door:' + d.id, g: T('Двери и прочее', 'Doors and others'), n: nm(DOOR, d.id), hp: d.hp, prot: d.prot }));
    return list;
  }
  const targetOf = () => targets().find((t) => t.id === S.target) || targets()[0];

  // damage after the protection of the target: every damage type is reduced by its own protection (-1 = double damage)
  function effective(prot, dmg) {
    let sum = 0;
    for (const e of dmg) { const p = prot[e.type] ?? 0; sum += e.amount * (1 - Math.min(1, p)); }
    return sum;
  }

  // raw materials of an item (recipes are followed down to what cannot be crafted)
  const memoRaw = {};
  function raw(id, depth = 0) {
    if (memoRaw[id]) return memoRaw[id];
    const it = WK.by[id], out = {};
    if (!it || !it.cr || depth > 6) { out[id] = 1; return (memoRaw[id] = out); }
    for (const [s, n] of it.cr.i) for (const [k, v] of Object.entries(raw(s, depth + 1))) out[k] = (out[k] || 0) + (v * n) / it.cr.a;
    return (memoRaw[id] = out);
  }
  const rawTimes = (id, n) => Object.fromEntries(Object.entries(raw(id)).map(([k, v]) => [k, v * n]));
  const ORDER = ['sulfur', 'charcoal', 'metal.fragments', 'lowgradefuel', 'cloth', 'techparts', 'metal.refined', 'wood', 'stones', 'fat.animal', 'metal.pipe'];
  const rawHtml = (r) => '<div class="rawl">' + Object.entries(r).filter(([, v]) => v >= 0.5).sort((a, b) => (ORDER.indexOf(a[0]) < 0 ? 99 : ORDER.indexOf(a[0])) - (ORDER.indexOf(b[0]) < 0 ? 99 : ORDER.indexOf(b[0])) || b[1] - a[1])
    .map(([k, v]) => '<span class="rw" title="' + esc(itemName(k)) + '">' + icon(k) + '<b>' + num(v) + '</b><em>' + esc(itemName(k)) + '</em></span>').join('') + '</div>';

  function weapons(t) {
    return D.raid.explosives.map((w) => {
      const per = effective(t.prot, w.damage), n = per > 0 ? Math.ceil(t.hp / per) : Infinity, r = rawTimes(w.id, n * S.qty);
      const craft = !!(WK.by[w.id] && WK.by[w.id].cr);
      return { id: w.id, per, n, total: n * S.qty, raw: craft ? r : {}, craft, sulfur: craft ? (r.sulfur || 0) : Infinity, unit: craft ? (raw(w.id).sulfur || 0) : Infinity };
    });
  }

  /* ---------- panels ---------- */
  const targetSelect = () => {
    const groups = {};
    targets().forEach((t) => (groups[t.g] = groups[t.g] || []).push(t));
    return '<select data-tf="target">' + Object.entries(groups).map(([g, l]) => '<optgroup label="' + esc(g) + '">' + l.map((t) => '<option value="' + t.id + '"' + (t.id === S.target ? ' selected' : '') + '>' + esc(t.n) + ' (' + t.hp + ' HP)</option>').join('') + '</optgroup>').join('') + '</select>';
  };
  const qtyBox = () => '<div class="tq"><input type="number" min="1" max="999" data-tf="qty" value="' + S.qty + '">' + [2, 5, 10].map((k) => '<button class="fc" data-tmul="' + k + '">×' + k + '</button>').join('') + '<button class="fc" data-tmul="1">' + T('сброс', 'reset') + '</button></div>';

  function raidForm() {
    return '<div class="tform"><label>' + T('Что рейдим', 'Target') + targetSelect() + '</label><label>' + T('Сколько штук (×2, ×5, ×10 умножают)', 'How many (×2, ×5, ×10 multiply)') + qtyBox() + '</label></div><div id="tlRes"></div>';
  }
  function raidRes() {
    const t = targetOf(), ws = weapons(t).sort((a, b) => (a.sulfur === b.sulfur ? 0 : a.sulfur < b.sulfur ? -1 : 1));
    const best = ws.find((w) => Number.isFinite(w.n) && w.craft);
    return '<div class="tnote">' + T('Цель', 'Target') + ': <b>' + esc(t.n) + '</b> · ' + t.hp + ' HP × ' + S.qty + '</div><div class="ttab">' + ws.map((w) => {
      if (!Number.isFinite(w.n)) return '<div class="trow bad"><div class="tn">' + icon(w.id) + '<b>' + esc(nm(WEAP, w.id)) + '</b></div><div class="tx">' + T('не пробивает эту цель', 'cannot break this target') + '</div></div>';
      if (!w.craft) return '<div class="trow bad"><div class="tn">' + icon(w.id) + '<b>' + esc(nm(WEAP, w.id)) + '</b></div><div class="tx"><b>' + num(w.total) + ' ' + T('шт.', 'pcs') + '</b><small>' + T('урон за удар', 'damage per hit') + ': ' + w.per.toFixed(1) + '</small></div><div class="tx" style="grid-column:span 2"><small>' + T('в этой версии игры не крафтится, цена неизвестна', 'cannot be crafted in this game version, no price') + '</small></div></div>';
      return '<div class="trow' + (w === best ? ' best' : '') + '"><div class="tn">' + icon(w.id) + '<b>' + esc(nm(WEAP, w.id)) + '</b>' + (w === best ? '<span class="ub new">' + T('дешевле всего', 'cheapest') + '</span>' : '') + '</div><div class="tx"><b>' + num(w.total) + ' ' + T('шт.', 'pcs') + '</b><small>' + T('урон за удар', 'damage per hit') + ': ' + w.per.toFixed(1) + '</small></div><div class="tx"><b>' + num(w.sulfur) + '</b><small>' + T('серы всего', 'sulfur total') + '</small></div><div class="tr">' + rawHtml(w.raw) + '</div></div>';
    }).join('') + '</div><p class="mut tfoot">' + T('Серу и остальное нужно добыть: стоимость считается по рецептам игры вплоть до сырья.', 'Everything is counted down to raw materials with the recipes of the game.') + '</p>';
  }

  function ecoRes() {
    const t = targetOf(), ws = weapons(t).filter((w) => Number.isFinite(w.n) && w.craft);
    const combos = [];
    ws.forEach((a) => combos.push({ parts: [[a, Math.ceil(t.hp / a.per)]], cost: Math.ceil(t.hp / a.per) * a.unit }));
    ws.forEach((a) => ws.forEach((b) => {
      if (a === b) return;
      const ca = Math.ceil(t.hp / a.per);
      for (let x = 1; x < ca; x++) {
        const left = t.hp - x * a.per, y = Math.max(1, Math.ceil(left / b.per));
        if (x * a.per + (y - 1) * b.per >= t.hp) continue; // one piece too many: not a real option
        combos.push({ parts: [[a, x], [b, y]], cost: x * a.unit + y * b.unit });
      }
    }));
    combos.sort((p, q) => p.cost - q.cost || p.parts.reduce((s, z) => s + z[1], 0) - q.parts.reduce((s, z) => s + z[1], 0));
    const seen = new Set(), top = [];
    for (const c of combos) { const key = c.parts.map((p) => p[0].id + p[1]).join('+'); if (!seen.has(key)) { seen.add(key); top.push(c); } if (top.length >= 6) break; }
    return '<div class="tnote">' + T('Самый дешёвый по сере способ разрушить', 'Cheapest way in sulfur to break') + ': <b>' + esc(t.n) + '</b> × ' + S.qty + '</div><div class="ttab">' + top.map((c, i) => {
      const r = {};
      c.parts.forEach(([w, n]) => Object.entries(rawTimes(w.id, n * S.qty)).forEach(([k, v]) => (r[k] = (r[k] || 0) + v)));
      return '<div class="trow' + (i === 0 ? ' best' : '') + '"><div class="tn">' + c.parts.map(([w, n]) => icon(w.id) + '<b>' + num(n * S.qty) + ' × ' + esc(nm(WEAP, w.id)) + '</b>').join(' + ') + (i === 0 ? '<span class="ub new">' + T('эко', 'eco') + '</span>' : '') + '</div><div class="tx"><b>' + num(c.cost * S.qty) + '</b><small>' + T('серы всего', 'sulfur total') + '</small></div><div class="tr">' + rawHtml(r) + '</div></div>';
    }).join('') + '</div><p class="mut tfoot">' + T('Урон складывается: например, остаток стены добивается самым дешёвым боеприпасом.', 'Damage adds up: the rest of a wall is finished with the cheapest ammo.') + '</p>';
  }

  function wallForm() {
    return '<div class="tform"><label>' + T('Цель', 'Target') + targetSelect() + '</label><label>' + T('Чем бьём', 'Tool') + '<select data-tf="tool">' + D.raid.melee.map((m) => '<option value="' + m.id + '"' + (m.id === S.tool ? ' selected' : '') + '>' + esc(nm(TOOL, m.id)) + '</option>').join('') + '</select></label><label>' + T('Сколько целей', 'How many') + qtyBox() + '</label></div><div id="tlRes"></div>';
  }
  function wallRes() {
    const t = targetOf(), m = D.raid.melee.find((x) => x.id === S.tool) || D.raid.melee[0], per = effective(t.prot, m.damage);
    if (per <= 0.0001) return '<div class="tnote bad">' + T('Этим инструментом цель не пробить: она защищена от такого урона.', 'This tool cannot damage the target: it is protected from that damage.') + '</div>';
    const hits = Math.ceil(t.hp / per) * S.qty, time = hits * m.delay, tools = m.maxCondition ? Math.ceil(hits / m.maxCondition) : 1;
    return '<div class="tgrid4"><div class="tc"><b>' + num(hits) + '</b><small>' + T('ударов', 'hits') + '</small></div><div class="tc"><b>' + fmtTime(time) + '</b><small>' + T('времени (удар раз в ' + m.delay + ' с)', 'time (a hit every ' + m.delay + ' s)') + '</small></div><div class="tc"><b>' + num(tools) + '</b><small>' + T('инструментов (прочность ' + m.maxCondition + ')', 'tools (durability ' + m.maxCondition + ')') + '</small></div><div class="tc"><b>' + per.toFixed(1) + '</b><small>' + T('урон за удар', 'damage per hit') + '</small></div></div><p class="mut tfoot">' + T('Прочность тратится примерно по 1 за удар, поэтому число инструментов приблизительное. Дерево и металл защищены по-разному, поэтому одни цели ломаются быстрее других.', 'Durability drops about 1 per hit, so the number of tools is approximate.') + '</p>';
  }

  function decayForm() {
    return '<div class="tform"><label>' + T('Сколько часов без шкафа с ресурсами', 'Hours without a stocked cupboard') + '<input type="number" min="0" max="48" step="0.5" data-tf="decayH" value="' + S.decayH + '"></label></div><div id="tlRes"></div>';
  }
  function decayRes() {
    const d = D.raid.decay;
    return '<div class="ttab">' + ['twig', 'wood', 'stone', 'metal', 'toptier'].map((k) => {
      const e = d[k], left = Math.max(0, 100 - (100 * Math.max(0, S.decayH - e.delay)) / e.duration);
      return '<div class="trow"><div class="tn"><b>' + esc(nm(TIER, k)) + '</b></div><div class="tx"><b>' + e.duration + ' ' + T('ч', 'h') + '</b><small>' + T('до полного разрушения', 'until fully decayed') + '</small></div><div class="tx"><b>' + left.toFixed(0) + '%</b><small>' + T('здоровья останется через', 'health left after') + ' ' + S.decayH + ' ' + T('ч', 'h') + '</small></div><div class="tbar"><i style="width:' + left + '%"></i></div></div>';
    }).join('') + '</div><p class="mut tfoot">' + T('Пока в шкафу есть ресурсы для содержания, постройка не гниёт. Значения взяты из настроек сервера (масштаб ×' + d.scale + ').', 'A building does not decay while the cupboard holds enough upkeep. Values come from the server settings (scale ×' + d.scale + ').') + '</p>';
  }

  /* door codes: a code lock has four digits, 10 000 codes in all */
  const POPULAR = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1212', '4321', '1337', '6969', '2580', '1004', '2000', '0123', '1122', '7890', '2020', '1313', '4200', '0420', '1010'];
  function nextBatch() {
    const used = new Set(tried);
    const pool = [];
    if (S.codeHot) POPULAR.forEach((c) => { if (!used.has(c)) pool.push(c); });
    const rest = [];
    for (let i = 0; i < 10000; i++) { const c = String(i).padStart(4, '0'); if (!used.has(c) && !pool.includes(c)) rest.push(c); }
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    batch = pool.concat(rest).slice(0, S.codeN);
  }
  function codesForm() {
    return '<div class="tform"><label>' + T('Кодов в пачке', 'Codes per batch') + '<select data-tf="codeN">' + [10, 20, 50, 100].map((n) => '<option' + (n === S.codeN ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label><label class="tcheck"><input type="checkbox" data-tf="codeHot"' + (S.codeHot ? ' checked' : '') + '> ' + T('сначала популярные коды (1234, 0000…)', 'popular codes first (1234, 0000…)') + '</label><label>' + T('Проверка: введи свой код, покажу за сколько попыток он найдётся', 'Test: type your own code to see how many tries it takes') + '<input type="text" inputmode="numeric" maxlength="4" data-tf="codeMine" value="' + esc(S.codeMine) + '" placeholder="1887"></label></div><div id="tlRes"></div>';
  }
  function codesRes() {
    if (!batch.length) nextBatch();
    const p = (tried.length / 100).toFixed(1);
    let sim = '';
    if (/^\d{4}$/.test(S.codeMine)) {
      const pool = Array.from({ length: 10000 }, (_, i) => String(i).padStart(4, '0')), idx = pool.indexOf(S.codeMine);
      const rank = POPULAR.indexOf(S.codeMine);
      const average = S.codeHot && rank >= 0 ? rank + 1 : 5000;
      sim = '<div class="tnote">' + T('Код', 'Code') + ' <b>' + esc(S.codeMine) + '</b>: ' + (S.codeHot && rank >= 0 ? T('он в списке популярных, найдётся уже за ~' + (rank + 1) + ' попыток', 'it is on the popular list, found within ~' + (rank + 1) + ' tries') : T('случайный подбор в среднем найдёт его за ~' + num(average) + ' попыток из 10 000', 'random guessing finds it in ~' + num(average) + ' tries out of 10,000 on average')) + '. ' + T('Чем сложнее код, тем он надёжнее.', 'The less guessable the code, the safer it is.') + ' (#' + (idx + 1) + ')</div>';
    }
    return sim + '<div class="tnote">' + T('Перепробовано', 'Tried') + ': <b>' + tried.length + '</b> / 10 000 (' + p + '%) · ' + T('осталось', 'left') + ' ' + num(10000 - tried.length) + '</div><div class="codes">' + batch.map((c) => '<button class="code" data-tcopy="' + c + '">' + c + '</button>').join('') + '</div><div class="tq"><button class="btn pri" data-tcodes="done">' + T('Эти я пробовал, дай новые', 'I tried these, give new ones') + '</button><button class="btn" data-tcodes="new">' + T('Другие (не отмечая)', 'Others (do not mark)') + '</button><button class="btn" data-tcodes="reset">' + T('Сбросить историю', 'Clear history') + '</button></div><p class="mut tfoot">' + T('Коды не повторяются: пробованные запоминаются в этом браузере. Нажми на код, чтобы скопировать. Подбирать коды можно только к своим замкам и на своём сервере по правилам.', 'Codes never repeat: tried ones are remembered in this browser. Click a code to copy it. Use it only for your own locks and within the server rules.') + '</p>';
  }

  /* mining */
  function mineForm() {
    const m = D.raid.mining, list = S.mine === 'pumpjack' ? ['crude.oil'] : ['stones', 'metal.ore', 'sulfur.ore', 'hq.metal.ore'];
    if (!list.includes(S.res) && S.mine !== 'excavator') S.res = list[0];
    return '<div class="tform"><label>' + T('Машина', 'Machine') + '<select data-tf="mine">' + [['quarry', 'Карьер', 'Mining quarry'], ['pumpjack', 'Нефтяной насос', 'Pump jack'], ['excavator', 'Гигантский экскаватор', 'Giant excavator']].map((o) => '<option value="' + o[0] + '"' + (S.mine === o[0] ? ' selected' : '') + '>' + T(o[1], o[2]) + '</option>').join('') + '</select></label>' + (S.mine === 'excavator' ? '' : '<label>' + T('Ресурс', 'Resource') + '<select data-tf="res">' + list.map((r) => '<option value="' + r + '"' + (S.res === r ? ' selected' : '') + '>' + esc(nm(RES, r)) + '</option>').join('') + '</select></label>') + '<label>' + T('Часов работы', 'Hours running') + '<select data-tf="hours">' + [1, 3, 8, 24, 72, 168].map((h) => '<option value="' + h + '"' + (S.hours == h ? ' selected' : '') + '>' + h + ' ' + T('ч', 'h') + '</option>').join('') + '</select></label></div><div id="tlRes"></div>';
  }
  function mineRes() {
    const m = D.raid.mining, h = +S.hours;
    if (S.mine === 'excavator') {
      const ex = m.excavator;
      if (!ex) return '<div class="tnote bad">' + T('Данных по экскаватору нет.', 'No excavator data.') + '</div>';
      return '<div class="ttab">' + ex.resources.map((r) => { const per = (r.amount * 3600) / ex.timeForFullResources; return '<div class="trow"><div class="tn">' + icon(r.item) + '<b>' + esc(itemName(r.item)) + '</b></div><div class="tx"><b>' + num(per) + '</b><small>' + T('в час', 'per hour') + '</small></div><div class="tx"><b>' + num(per * h) + '</b><small>' + T('за', 'in') + ' ' + h + ' ' + T('ч', 'h') + '</small></div></div>'; }).join('') + '</div><p class="mut tfoot">' + T('Экскаватор нужно запитать от электричества, топливо не нужно. Расчёт по настройкам игры: полный набор ресурсов за ' + ex.timeForFullResources + ' с.', 'The excavator needs power, not fuel. Calculated from the game settings: a full set of resources per ' + ex.timeForFullResources + ' s.') + '</p>';
    }
    const q = m[S.mine], w = m.work[S.res];
    if (!q || !w) return '<div class="tnote bad">' + T('Для этого ресурса данных нет.', 'No data for this resource.') + '</div>';
    const workH = (3600 / q.processRate) * q.workToAdd, perH = workH / w.w, fuelH = workH / q.workPerFuel;
    return '<div class="tgrid4"><div class="tc"><b>' + num(perH) + '</b><small>' + esc(nm(RES, S.res)) + ' ' + T('в час', 'per hour') + '</small></div><div class="tc"><b>' + num(perH * h) + '</b><small>' + T('за', 'in') + ' ' + h + ' ' + T('ч', 'h') + '</small></div><div class="tc"><b>' + (fuelH * h).toFixed(1) + '</b><small>' + T('топлива за это время', 'fuel for that time') + '</small></div><div class="tc"><b>' + (perH / Math.max(0.01, fuelH)).toFixed(0) + '</b><small>' + T('ресурса с 1 ед. топлива', 'resource per fuel unit') + '</small></div></div><p class="mut tfoot">' + T('Расчёт по настройкам игры (работа ' + q.workToAdd + ' раз в ' + q.processRate + ' с, ресурс «стоит» ' + w.w + ' работы). Реальный выход зависит от залежи.', 'Calculated from the game settings (' + q.workToAdd + ' work every ' + q.processRate + ' s, the resource costs ' + w.w + ' work). The real yield depends on the deposit.') + '</p>';
  }

  /* plant genes: per slot the genes of the plants around are summed with their weights, the heaviest gene wins */
  const GW = { X: 1, W: 1, G: 0.6, Y: 0.6, H: 0.6 };
  function genesForm() {
    return '<div class="tform"><p class="mut" style="margin:0 0 6px">' + T('Впиши гены соседних растений (до 8 штук, по 6 букв: G, Y, H, W, X). Зелёные гены G, Y, H полезные, красные W и X вредные.', 'Type the genes of the plants around (up to 8, six letters each: G, Y, H, W, X). Green G, Y, H are good, red W and X are bad.') + '</p><div class="gin">' + S.genes.map((g, i) => '<input class="gi" maxlength="6" placeholder="GYGHYG" data-tg="' + i + '" value="' + esc(g) + '">').join('') + '</div></div><div id="tlRes"></div>';
  }
  function genesRes() {
    const list = S.genes.map((g) => g.toUpperCase().replace(/[^GYHWX]/g, '')).filter((g) => g.length === 6);
    if (list.length < 2) return '<div class="tnote">' + T('Нужно хотя бы два растения с шестью генами.', 'At least two plants with six genes are needed.') + '</div>';
    let result = '', ties = false;
    const slots = [];
    for (let i = 0; i < 6; i++) {
      const sum = {};
      list.forEach((g) => (sum[g[i]] = (sum[g[i]] || 0) + GW[g[i]]));
      const max = Math.max(...Object.values(sum)), win = Object.keys(sum).filter((k) => sum[k] === max);
      if (win.length > 1) ties = true;
      result += win.length > 1 ? '?' : win[0];
      slots.push({ sum, win });
    }
    const col = (c) => '<b class="g' + (/[GYH]/.test(c) ? 'p' : c === '?' ? 'q' : 'n') + '">' + c + '</b>';
    const good = [...result].filter((c) => /[GYH]/.test(c)).length;
    return '<div class="tnote">' + T('Получится', 'Result') + ': <span class="gres">' + [...result].map(col).join('') + '</span> · ' + T('полезных генов', 'good genes') + ': <b>' + good + '/6</b>' + (ties ? ' · ' + T('«?» значит равенство весов, итог зависит от игры', '"?" means equal weights, the game decides') : '') + '</div><div class="ttab">' + slots.map((s, i) => '<div class="trow"><div class="tn"><b>' + T('Ячейка', 'Slot') + ' ' + (i + 1) + '</b></div><div class="tx">' + Object.entries(s.sum).sort((a, b) => b[1] - a[1]).map(([k, v]) => col(k) + ' ' + v.toFixed(1)).join(' · ') + '</div><div class="tx"><b>' + s.win.join('/') + '</b></div></div>').join('') + '</div><p class="mut tfoot">' + T('Вес гена: G, Y, H = 0.6, W и X = 1 (из настроек игры). Побеждает ген с наибольшей суммой среди растений вокруг.', 'Gene weight: G, Y, H = 0.6, W and X = 1 (from the game). The gene with the biggest sum around wins.') + '</p>';
  }

  /* ---------- screen ---------- */
  const PANEL = {
    raid: [raidForm, raidRes], eco: [raidForm, ecoRes], wall: [wallForm, wallRes], decay: [decayForm, decayRes],
    codes: [codesForm, codesRes], mine: [mineForm, mineRes], genes: [genesForm, genesRes],
  };
  const INTRO = {
    raid: ['Сколько и чего нужно, чтобы вскрыть цель, и во сколько это обойдётся в сырье.', 'How much of what it takes to break a target and what it costs in raw materials.'],
    eco: ['Самый дешёвый по сере способ, с учётом смешанных взрывчаток.', 'The cheapest way in sulfur, mixing explosives where it helps.'],
    wall: ['Сколько ударов, времени и инструментов нужно, чтобы выломать стену или дверь.', 'How many hits, how much time and how many tools to break through a wall or door.'],
    decay: ['Через сколько часов постройка сгниёт без шкафа.', 'How many hours until a building decays without a cupboard.'],
    codes: ['Список кодовых замков без повторов: пробуй пачками и отмечай.', 'A list of lock codes without repeats: try them in batches and mark them.'],
    mine: ['Сколько выкопает карьер, насос или экскаватор и сколько топлива уйдёт.', 'What a quarry, pump jack or excavator digs and how much fuel it burns.'],
    genes: ['Какие гены получатся при скрещивании растений рядом.', 'Which genes crossbreeding the plants around gives.'],
  };

  function draw() {
    const box = document.getElementById('tlBox');
    if (!box) return;
    if (D.failed) { box.innerHTML = '<p class="mut" style="text-align:center">' + T('Не удалось загрузить данные калькуляторов. Попробуй позже.', 'Could not load the calculator data. Try again later.') + '</p>'; return; }
    if (!D.raid || !WK.data) { box.innerHTML = '<p class="mut" style="text-align:center">' + T('Загрузка данных…', 'Loading data…') + '</p>'; return; }
    const tabs = document.getElementById('tlTabs');
    if (tabs) tabs.innerHTML = TABS.map((t) => '<button class="fc' + (t[0] === S.tab ? ' on' : '') + '" data-tt="' + t[0] + '">' + T(t[1], t[2]) + '</button>').join('');
    const [form, res] = PANEL[S.tab];
    box.innerHTML = '<p class="mut" style="margin:0 0 14px">' + T(INTRO[S.tab][0], INTRO[S.tab][1]) + '</p>' + form();
    results();
  }
  function results() {
    const r = document.getElementById('tlRes');
    if (r) r.innerHTML = PANEL[S.tab][1]();
  }

  window.toolsHtml = function () {
    setTimeout(() => { boot(); draw(); }, 0);
    return '<section id="tools"><div class="wrap">' + ttl(T('Рейды и калькуляторы', 'Raids and calculators')) + '<p class="note" style="margin:-14px 0 24px">' + T('Цифры берутся прямо из игры нашего сервера, поэтому после обновления Rust они меняются сами.', 'The numbers come straight from our game server, so they follow the Rust updates.') + '</p><div class="fch" id="tlTabs"></div><div id="tlBox" class="tbox"></div></div></section>';
  };

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    let b;
    if ((b = e.target.closest('[data-tt]'))) { S.tab = b.dataset.tt; draw(); return; }
    if ((b = e.target.closest('[data-tmul]'))) { const k = +b.dataset.tmul; S.qty = k === 1 ? 1 : Math.min(999, S.qty * k); draw(); return; }
    if ((b = e.target.closest('[data-tcopy]'))) { try { navigator.clipboard.writeText(b.dataset.tcopy); b.classList.add('on'); } catch (err) { /* no clipboard */ } return; }
    if ((b = e.target.closest('[data-tcodes]'))) {
      const a = b.dataset.tcodes;
      if (a === 'done') { tried = [...new Set(tried.concat(batch))]; saveTried(); }
      if (a === 'reset') { tried = []; saveTried(); }
      nextBatch(); results(); return;
    }
  });
  function onField(e) {
    const f = e.target.closest('[data-tf]');
    if (f) {
      const k = f.dataset.tf;
      S[k] = f.type === 'checkbox' ? f.checked : (f.type === 'number' || k === 'hours' || k === 'codeN') ? Math.max(0, +f.value || 0) : f.value;
      if (k === 'qty') S.qty = Math.max(1, Math.min(999, Math.round(S.qty || 1)));
      if (e.type === 'change' && (k === 'mine' || k === 'target' || k === 'tool' || k === 'codeN' || k === 'codeHot')) { if (k === 'codeN' || k === 'codeHot') nextBatch(); draw(); return; }
      results(); return;
    }
    const g = e.target.closest('[data-tg]');
    if (g) { S.genes[+g.dataset.tg] = g.value; results(); }
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
})();
