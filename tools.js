/* Raid and farming calculators. The numbers come from the running game (raid.json, wiki.json), see tools/site-data/build.mjs. */
(function () {
  'use strict';
  const T = (ru, en) => (LANG === 'en' ? en : ru);
  const D = { raid: null, failed: false, loading: false };
  const S = {
    tab: 'raid', smw: 'explosive.timed', smhp: 0, target: 'tier:stone', qty: 1, tool: 'hatchet', toolQty: 1, decayH: 2, codeN: 10, codeHot: true, codeMine: '',
    mine: 'quarry', res: 'stones', hours: 8, genes: ['', '', '', '', '', '', '', ''], rate: 1,
  };
  let tried = [], batch = [];
  try { tried = JSON.parse(localStorage.getItem('lima.codes') || '[]'); } catch (e) { tried = []; }
  const saveTried = () => { try { localStorage.setItem('lima.codes', JSON.stringify(tried)); } catch (e) { /* private mode */ } };

  const TABS = [
    ['smash', 'Сломай стену', 'Break the wall'], ['raid', 'Рейд', 'Raid'], ['eco', 'Эко-рейд', 'Eco raid'], ['wall', 'Стена и инструмент', 'Wall and tool'], ['decay', 'Гниение', 'Decay'],
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
    'wall.frame.cell': ['Решётчатая камера', 'Prison cell wall'], turret: ['Автотурель', 'Auto turret'], vending: ['Торговый автомат', 'Vending machine'], sam: ['ПВО-турель', 'SAM site'], 'furnace.large': ['Большая печь', 'Large furnace'], 'box.wood.large': ['Большой ящик', 'Large box'], cupboard: ['Шкаф (TC)', 'Tool cupboard'],
  };
  const WEAP = {
    'explosive.timed': ['C4', 'C4'], 'explosive.satchel': ['Сумка со взрывчаткой', 'Satchel charge'], 'ammo.rocket.basic': ['Ракета', 'Rocket'],
    'ammo.rocket.hv': ['Скоростная ракета', 'HV rocket'], 'ammo.rocket.fire': ['Зажигательная ракета', 'Incendiary rocket'], 'grenade.beancan': ['Бобовая граната', 'Beancan grenade'],
    'grenade.f1': ['Граната Ф1', 'F1 grenade'], 'ammo.rifle.explosive': ['Разрывные патроны 5.56', 'Explosive 5.56 ammo'], 'catapult.ammo.explosive': ['Пропановая бомба', 'Propane bomb'], 'ammo.rocket.mlrs': ['Ракета MLRS', 'MLRS rocket'], 'ammo.rocket.seeker': ['Самонаводящаяся ракета', 'Homing missile'], 'submarine.torpedo.straight': ['Торпеда', 'Torpedo'], 'grenade.molotov': ['Коктейль Молотова', 'Molotov cocktail'], 'ballista.bolt.hammerhead': ['Болт «Молот»', 'Hammerhead bolt'], surveycharge: ['Разведзаряд', 'Survey charge'], 'grenade.flashbang': ['Светошумовая граната', 'Flashbang'], 'catapult.ammo.boulder': ['Булыжник катапульты', 'Scattershot'], 'ammo.grenadelauncher.he': ['Граната 40 мм (HE)', '40mm HE grenade'],
  };
  const TOOL = {
    rock: ['Камень', 'Rock'], stonehatchet: ['Каменный топор', 'Stone hatchet'], 'stone.pickaxe': ['Каменная кирка', 'Stone pickaxe'], hatchet: ['Топор', 'Hatchet'],
    pickaxe: ['Кирка', 'Pick axe'], 'axe.salvaged': ['Топор из металлолома', 'Salvaged axe'], 'icepick.salvaged': ['Ледоруб из металлолома', 'Salvaged icepick'],
    'hammer.salvaged': ['Молот из металлолома', 'Salvaged hammer'], machete: ['Мачете', 'Machete'], mace: ['Булава', 'Mace'], longsword: ['Длинный меч', 'Longsword'],
    'salvaged.sword': ['Меч из металлолома', 'Salvaged sword'], 'bone.club': ['Костяная дубина', 'Bone club'], 'spear.wooden': ['Деревянное копьё', 'Wooden spear'],
    'spear.stone': ['Каменное копьё', 'Stone spear'], 'knife.combat': ['Боевой нож', 'Combat knife'], 'knife.bone': ['Костяной нож', 'Bone knife'], pitchfork: ['Вилы', 'Pitchfork'],
    sickle: ['Серп', 'Sickle'], paddle: ['Весло', 'Paddle'], jackhammer: ['Отбойный молоток', 'Jackhammer'], chainsaw: ['Бензопила', 'Chainsaw'], 'salvaged.cleaver': ['Тесак из металлолома', 'Salvaged cleaver'], baseballbat: ['Бейсбольная бита', 'Baseball bat'], shovel: ['Лопата', 'Shovel'], torch: ['Факел', 'Torch'], 'flashlight.held': ['Фонарик', 'Flashlight'], 'knife.butcher': ['Мясницкий нож', 'Butcher knife'], boomerang: ['Бумеранг', 'Boomerang'],
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
    loadBase();
    D.loading = true;
    try {
      D.raid = await (await fetch('raid.json')).json();
      if (!WK.data) await loadWiki();
      if (!WK.data || !WK.data.length) throw new Error('wiki');
      cleanBase();
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

  /* ---------- base raid: several targets, every way to break them ---------- */
  // seconds per piece: how long one use takes (approximate: placing, fuse, reloading)
  const OT = { 'explosive.timed': 6, 'explosive.satchel': 2, 'ammo.rocket.basic': 2.5, 'ammo.rocket.hv': 2.5, 'ammo.rocket.fire': 2.5, 'grenade.beancan': 0.6, 'grenade.f1': 1.5, 'ammo.grenadelauncher.he': 0.35, 'ammo.rifle.explosive': 0.14, 'catapult.ammo.explosive': 2.5, 'ammo.rocket.mlrs': 5, 'ammo.rocket.seeker': 3, 'submarine.torpedo.straight': 0.25, 'grenade.molotov': 1, surveycharge: 3, 'grenade.flashbang': 0.5 };
  const TICON = { 'door.wood': 'door.hinged.wood', 'door.metal': 'door.hinged.metal', 'door.armored': 'door.hinged.toptier', 'door.double.wood': 'door.double.hinged.wood', 'door.double.metal': 'door.double.hinged.metal', 'door.double.armored': 'door.double.hinged.toptier', garage: 'wall.frame.garagedoor', 'wall.high.wood': 'wall.external.high', 'wall.high.stone': 'wall.external.high.stone', 'gate.high.wood': 'gates.external.high.wood', 'gate.high.stone': 'gates.external.high.stone', 'ladder.hatch': 'floor.ladder.hatch', shutters: 'shutter.wood.a', 'window.bars.metal': 'wall.window.bars.metal', 'window.glass': 'wall.window.glass.reinforced', 'wall.frame.cell': 'wall.frame.cell', 'box.wood.large': 'box.wooden.large', cupboard: 'cupboard.tool', turret: 'autoturret', vending: 'vending.machine', sam: 'samsite', 'furnace.large': 'furnace.large' };
  // vehicle and special ammo: it works, but nobody raids with it, so it is shown only on request
  const EXO = new Set(['catapult.ammo.boulder', 'submarine.torpedo.straight', 'ammo.rocket.mlrs', 'ammo.rocket.seeker', 'ballista.bolt.hammerhead', 'grenade.flashbang']);
  const TSW = { twig: '#b59a56', wood: '#9a6a34', stone: '#9aa093', metal: '#7a8da0', toptier: '#4b535d' };
  S.base = [{ id: 'tier:stone', qty: 1, hp: 0 }]; S.show = 'x'; S.sort = 'sulfur';
  const parseBase = (s) => s.split(',').map((p) => { const [id, q, h] = p.split('*'); return { id, qty: Math.max(1, Math.min(999, +q || 1)), hp: Math.max(0, +h || 0) }; }).filter((x) => x.id);
  function loadBase() {
    const m = location.hash.match(/[?&]b=([^&]+)/);
    if (m) { try { S.base = parseBase(decodeURIComponent(m[1])); return; } catch (e) { /* bad link */ } }
    try { const j = JSON.parse(localStorage.getItem('lima.base') || 'null'); if (Array.isArray(j) && j.length) S.base = j; } catch (e) { /* none */ }
  }
  const saveBase = () => { try { localStorage.setItem('lima.base', JSON.stringify(S.base)); } catch (e) { /* private mode */ } };
  const targetById = (id) => targets().find((x) => x.id === id);
  const tIcon = (tg) => (tg.id.indexOf('tier:') === 0 ? '<i class="tsw" style="background:' + TSW[tg.id.slice(5)] + '"></i>' : '<img src="' + itemIc(TICON[tg.id.slice(5)] || tg.id.slice(5)) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<i class=&quot;tsw&quot; style=&quot;background:#5a6070&quot;></i>\'">');
  function cleanBase() {
    S.base = S.base.filter((x) => targetById(x.id));
    if (!S.base.length) S.base = [{ id: 'tier:stone', qty: 1, hp: 0 }];
  }

  function catalogHtml() {
    const groups = {};
    targets().forEach((x) => (groups[x.g] = groups[x.g] || []).push(x));
    return Object.entries(groups).map(([g, l]) => '<div class="tgroup"><h4>' + esc(g) + '</h4><div class="tcat">' + l.map((x) => '<button class="tgc" data-tadd="' + x.id + '">' + tIcon(x) + '<span class="tgt"><b>' + esc(x.n) + '</b><small>' + x.hp + ' HP</small></span></button>').join('') + '</div></div>').join('');
  }
  function baseListHtml() {
    return S.base.map((b, i) => {
      const tg = targetById(b.id);
      return '<div class="brow">' + tIcon(tg) + '<b>' + esc(tg.n) + '</b><span class="mut">' + tg.hp + ' HP</span><label>×<input type="number" min="1" max="999" data-tb="' + i + ':qty" value="' + b.qty + '"></label><label>' + T('сейчас HP', 'current HP') + '<input type="number" min="0" max="' + tg.hp + '" data-tb="' + i + ':hp" value="' + b.hp + '" placeholder="' + tg.hp + '"></label><button class="fc" data-tmulrow="' + i + '">×2</button><button class="fc" data-tdel="' + i + '" aria-label="' + T('убрать', 'remove') + '">✕</button></div>';
    }).join('');
  }
  function raidForm() {
    return '<div class="tgroups">' + catalogHtml() + '</div><h4 class="tlist">' + T('Что рейдим (можно несколько целей)', 'What we raid (several targets allowed)') + '</h4><div class="tbase" id="tlBase">' + baseListHtml() + '</div><div class="tq" style="margin:12px 0 18px"><button class="btn" data-tclear>' + T('Очистить', 'Clear') + '</button><button class="btn" data-tlink>' + T('Скопировать ссылку на расчёт', 'Copy link to this calculation') + '</button><span class="mut" id="tlMsg"></span></div><div id="tlRes"></div>';
  }

  function allWeapons2() {
    // explosive rifle ammo lacks its splash part in the game data, so its numbers would be wrong: it is not listed
    const x = D.raid.explosives.filter((w) => w.id !== 'ammo.rifle.explosive').map((w) => ({ id: w.id, kind: 'x', cat: EXO.has(w.id) ? 'e' : 'x', damage: w.damage, time: OT[w.id] || 2 }));
    const m = D.raid.melee.map((w) => ({ id: w.id, kind: 'm', cat: 'm', damage: w.damage, time: w.delay, cond: w.maxCondition }));
    return x.concat(m);
  }
  function baseRows() {
    return allWeapons2().map((w) => {
      let n = 0, ok = true;
      for (const b of S.base) {
        const tg = targetById(b.id), hp = b.hp > 0 ? Math.min(b.hp, tg.hp) : tg.hp, per = effective(tg.prot, w.damage);
        if (per <= 0.0001) { ok = false; break; }
        n += Math.ceil(hp / per) * b.qty;
      }
      const craft = !!(WK.by[w.id] && WK.by[w.id].cr);
      const tools = w.kind === 'm' ? (w.cond ? Math.ceil(n / w.cond) : 1) : 0;
      const r = !ok ? {} : w.kind === 'x' ? (craft ? rawTimes(w.id, n) : {}) : (craft ? rawTimes(w.id, tools) : {});
      return { w, n, ok, craft, tools, time: n * w.time, raw: r, sulfur: craft ? (r.sulfur || 0) : (w.kind === 'x' ? Infinity : 0) };
    }).filter((r) => r.ok && (r.w.kind === 'x' || r.n <= 60000));
  }
  const fmtTimeRows = (r) => (r.w.kind === 'x' ? '≈ ' : '') + fmtTime(r.time);

  function raidRes() {
    cleanBase();
    let rows = baseRows();
    if (S.show !== 'a') rows = rows.filter((r) => r.w.cat === S.show);
    const key = S.sort;
    rows.sort((p, q) => (key === 'time' ? p.time - q.time : key === 'n' ? p.n - q.n : (p.sulfur === q.sulfur ? p.time - q.time : p.sulfur < q.sulfur ? -1 : 1)));
    const priced = rows.filter((r) => r.craft || r.w.kind === 'm');
    const cheap = priced.filter((r) => r.w.cat === 'x').sort((p, q) => p.sulfur - q.sulfur)[0];
    const fast = rows.slice().sort((p, q) => p.time - q.time)[0];
    const total = S.base.reduce((s, b) => s + b.qty, 0);
    const chips = (k, list) => '<div class="fch" style="margin:0">' + list.map(([v, ru, en]) => '<button class="fc' + (S[k] === v ? ' on' : '') + '" data-t' + k + '="' + v + '">' + T(ru, en) + '</button>').join('') + '</div>';
    const head = '<div class="trep"><div class="tnote" style="margin:0">' + T('Целей', 'Targets') + ': <b>' + total + '</b> · ' + S.base.map((b) => esc(targetById(b.id).n) + ' ×' + b.qty).join(', ') + '</div><div class="tctl">' + chips('show', [['x', 'Взрывчатка', 'Explosives'], ['m', 'Инструменты', 'Tools'], ['e', 'Техника и экзотика', 'Vehicle and special'], ['a', 'Всё', 'All']]) + chips('sort', [['sulfur', 'По сере', 'By sulfur'], ['time', 'По времени', 'By time'], ['n', 'По количеству', 'By count']]) + '</div></div>';
    if (!rows.length) return head + '<div class="tnote bad">' + T('Ничего из этого списка не пробивает выбранные цели.', 'Nothing in this list can break the chosen targets.') + '</div>';
    return head + '<div class="tgrid4">' + (cheap ? '<div class="tc best"><b>' + esc(nm(WEAP, cheap.w.id)) + '</b><small>' + T('дешевле всего по сере: ', 'cheapest in sulfur: ') + num(cheap.sulfur) + '</small></div>' : '') + (fast ? '<div class="tc"><b>' + esc(nm(fast.w.kind === 'x' ? WEAP : TOOL, fast.w.id)) + '</b><small>' + T('быстрее всего: ', 'fastest: ') + fmtTimeRows(fast) + '</small></div>' : '') + '</div><div class="ttab">' + rows.map((r) => {
      const name = nm(r.w.kind === 'x' ? WEAP : TOOL, r.w.id);
      const best = cheap && r === cheap;
      return '<div class="trow' + (best ? ' best' : '') + '"><div class="tn">' + icon(r.w.id) + '<b>' + esc(name) + '</b>' + (best ? '<span class="ub new">' + T('эко', 'eco') + '</span>' : '') + '</div><div class="tx"><b>' + num(r.n) + ' ' + (r.w.kind === 'x' ? T('шт.', 'pcs') : T('ударов', 'hits')) + '</b><small>' + (r.w.kind === 'm' ? num(r.tools) + ' ' + T('инстр.', 'tools') : T('нужно штук', 'pieces needed')) + '</small></div><div class="tx"><b>' + fmtTimeRows(r) + '</b><small>' + T('время', 'time') + '</small></div><div class="tr">' + (r.craft || r.w.kind === 'x' ? (r.craft ? '<div class="tsul">' + (r.w.kind === 'x' ? '<b>' + num(r.sulfur) + '</b> ' + T('серы', 'sulfur') : '<b>' + T('без серы', 'no sulfur') + '</b>') + '</div>' + rawHtml(r.raw) : '<small class="mut">' + T('в этой версии игры не крафтится', 'cannot be crafted in this version') + '</small>') : '<small class="mut">' + T('сырьё не нужно', 'no materials needed') + '</small>') + '</div></div>';
    }).join('') + '</div><p class="mut tfoot">' + T('Урон считается по защите каждой цели из игры. Время взрывчатки примерное (установка, запал, перезарядка), у инструментов это скорость ударов. Серу и остальное нужно добыть: цена считается по рецептам вплоть до сырья.', 'Damage uses the protection of each target from the game. Explosive time is approximate (placing, fuse, reload); for tools it is the swing speed. Prices follow the recipes down to raw materials.') + '</p>';
  }

  // cheapest mix for one target: damage adds up, so the rest of a wall is finished with the cheapest piece
  function bestMix(tg, hp) {
    const ws = allWeapons2().filter((w) => w.cat === 'x').map((w) => { const per = effective(tg.prot, w.damage), craft = !!(WK.by[w.id] && WK.by[w.id].cr); return { w, per, craft, unit: craft ? (raw(w.id).sulfur || 0) : Infinity }; }).filter((x) => x.per > 0.0001 && x.craft);
    const combos = [];
    ws.forEach((p) => combos.push({ parts: [[p, Math.ceil(hp / p.per)]], cost: Math.ceil(hp / p.per) * p.unit }));
    ws.forEach((p) => ws.forEach((q) => {
      if (p === q) return;
      const cp = Math.ceil(hp / p.per);
      for (let x = 1; x < cp; x++) {
        const y = Math.max(1, Math.ceil((hp - x * p.per) / q.per));
        if (x * p.per + (y - 1) * q.per >= hp) continue;
        combos.push({ parts: [[p, x], [q, y]], cost: x * p.unit + y * q.unit });
      }
    }));
    combos.sort((u, v) => u.cost - v.cost || u.parts.reduce((s, z) => s + z[1], 0) - v.parts.reduce((s, z) => s + z[1], 0));
    return combos[0] || null;
  }
  function ecoRes() {
    cleanBase();
    const total = {}; let sulfur = 0;
    const rows = S.base.map((b) => {
      const tg = targetById(b.id), hp = b.hp > 0 ? Math.min(b.hp, tg.hp) : tg.hp, mix = bestMix(tg, hp);
      if (!mix) return '<div class="trow bad"><div class="tn">' + tIcon(tg) + '<b>' + esc(tg.n) + '</b></div><div class="tx" style="grid-column:span 3"><small>' + T('нечем пробить из того, что можно скрафтить', 'nothing craftable can break it') + '</small></div></div>';
      const r = {};
      mix.parts.forEach(([p, n]) => Object.entries(rawTimes(p.w.id, n * b.qty)).forEach(([k, v]) => { r[k] = (r[k] || 0) + v; total[k] = (total[k] || 0) + v; }));
      sulfur += mix.cost * b.qty;
      return '<div class="trow best"><div class="tn">' + tIcon(tg) + '<b>' + esc(tg.n) + ' ×' + b.qty + '</b></div><div class="tx" style="grid-column:span 2">' + mix.parts.map(([p, n]) => icon(p.w.id) + '<b>' + num(n * b.qty) + ' × ' + esc(nm(WEAP, p.w.id)) + '</b>').join(' + ') + '</div><div class="tx"><b>' + num(mix.cost * b.qty) + '</b><small>' + T('серы', 'sulfur') + '</small></div></div>';
    }).join('');
    return '<div class="tnote">' + T('Самый дешёвый по сере план для всей базы: для каждой цели свой набор.', 'The cheapest plan in sulfur for the whole base: its own set for each target.') + '</div><div class="ttab">' + rows + '</div><div class="tnote" style="margin-top:14px">' + T('Итого серы', 'Total sulfur') + ': <b>' + num(sulfur) + '</b></div>' + rawHtml(total) + '<p class="mut tfoot">' + T('Урон складывается: остаток стены добивается самым дешёвым боеприпасом.', 'Damage adds up: the rest of a wall is finished with the cheapest ammo.') + '</p>';
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


  /* break the wall: click to hit, the wall loses health and falls apart brick by brick */
  const SM = { hp: 0, max: 0, hits: 0, dealt: 0, time: 0, auto: null, order: null, key: '' };
  const BRICKS = 40;
  function allWeapons() {
    const x = D.raid.explosives.map((w) => ({ id: w.id, kind: 'x', name: nm(WEAP, w.id), damage: w.damage, delay: 0.6 }));
    const m = D.raid.melee.map((w) => ({ id: w.id, kind: 'm', name: nm(TOOL, w.id), damage: w.damage, delay: w.delay, cond: w.maxCondition }));
    return x.concat(m);
  }
  const smWeapon = () => allWeapons().find((w) => w.id === S.smw) || allWeapons()[0];
  const smMax = () => (S.smhp > 0 ? S.smhp : targetOf().hp);
  function smStop() { if (SM.auto) { clearInterval(SM.auto); SM.auto = null; } }
  function smReset() {
    smStop();
    SM.max = smMax(); SM.hp = SM.max; SM.hits = 0; SM.dealt = 0; SM.time = 0;
    SM.order = Array.from({ length: BRICKS }, (_, i) => i).sort(() => Math.random() - 0.5);
  }
  function wallColor(t) {
    const id = t.id;
    if (id.indexOf('tier:') === 0) return { twig: '#b59a56', wood: '#9a6a34', stone: '#9aa093', metal: '#7a8da0', toptier: '#4b535d' }[id.slice(5)] || '#8d9185';
    if (/armored/.test(id) || /cell/.test(id)) return '#4b535d';
    if (/metal|garage|bars|hatch|glass/.test(id)) return '#7a8da0';
    if (/stone/.test(id)) return '#9aa093';
    return '#9a6a34';
  }
  function smashForm() {
    const key = S.target + '|' + S.smhp;
    if (!SM.max || SM.key !== key) { SM.key = key; smReset(); }
    const w = smWeapon();
    return '<div class="tform"><label>' + T('Что ломаем', 'Target') + targetSelect() + '</label><label>' + T('Чем бьём', 'Hit with') + '<select data-tf="smw"><optgroup label="' + T('Взрывчатка', 'Explosives') + '">' + allWeapons().filter((x) => x.kind === 'x').map((x) => '<option value="' + x.id + '"' + (x.id === S.smw ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</optgroup><optgroup label="' + T('Инструменты', 'Tools') + '">' + allWeapons().filter((x) => x.kind === 'm').map((x) => '<option value="' + x.id + '"' + (x.id === S.smw ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</optgroup></select></label><label>' + T('Прочность стены (HP), 0 = как в игре', 'Wall health (HP), 0 = as in the game') + '<input type="number" min="0" max="100000" data-tf="smhp" value="' + S.smhp + '"></label></div>'
      + '<div class="smcols"><div class="smstage"><div class="wall" id="smWall" style="--bc:' + wallColor(targetOf()) + '"><svg class="cracks" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0 L46 14 L54 24 L44 38 L52 60"/><path d="M46 14 L30 20 L22 34"/><path d="M54 24 L72 28 L80 44"/><path d="M44 38 L28 46"/><path d="M0 22 L18 26 L30 20"/><path d="M100 12 L84 18 L72 28"/></svg>'
      + Array.from({ length: BRICKS }, (_, i) => '<i class="brick" style="--i:' + (i % 5) + '" data-b="' + i + '"></i>').join('') + '<div class="boom" id="smBoom">💥</div></div><div class="smbar"><i id="smBar"></i><span id="smHp"></span></div><div class="tq"><button class="btn pri" data-smhit>' + T('Ударить', 'Hit') + ' ' + esc(w.name) + '</button><button class="btn" data-smauto id="smAuto">' + T('Бить автоматически', 'Auto hit') + '</button><button class="btn" data-smreset>' + T('Новая стена', 'New wall') + '</button></div></div><div class="smstats" id="smStats"></div></div><div id="tlRes"></div>';
  }
  function smPaint(shake) {
    const wall = document.getElementById('smWall');
    if (!wall) return;
    const pct = Math.max(0, SM.hp / SM.max), w = smWeapon(), t = targetOf(), per = effective(t.prot, w.damage);
    const gone = Math.floor((1 - pct) * BRICKS + (pct < 1 ? 0.0001 : 0));
    wall.querySelectorAll('.brick').forEach((b) => b.classList.toggle('gone', SM.order.indexOf(+b.dataset.b) < gone));
    wall.querySelectorAll('.cracks path').forEach((p, i) => (p.style.opacity = (1 - pct) * 6 > i ? 1 : 0));
    document.getElementById('smBar').style.width = pct * 100 + '%';
    document.getElementById('smBar').style.background = pct > 0.5 ? 'var(--lime)' : pct > 0.2 ? 'var(--orange)' : '#ff5a4a';
    document.getElementById('smHp').textContent = Math.ceil(SM.hp) + ' / ' + Math.round(SM.max) + ' HP';
    wall.classList.toggle('dead', SM.hp <= 0);
    if (shake) { wall.classList.remove('shake'); void wall.offsetWidth; wall.classList.add('shake'); }
    const left = SM.hp <= 0 ? 0 : per > 0 ? Math.ceil(SM.hp / per) : Infinity;
    const r = w.kind === 'x' ? rawTimes(w.id, SM.hits) : {};
    const sulfur = r.sulfur || 0;
    const tools = w.kind === 'm' && w.cond ? Math.ceil(SM.hits / w.cond) : 0;
    document.getElementById('smStats').innerHTML = (per <= 0.0001 ? '<div class="tnote bad">' + T('Этим цель не пробить: она защищена от такого урона.', 'This cannot hurt the target: it is protected from that damage.') + '</div>' : '')
      + '<div class="tgrid4"><div class="tc"><b>' + SM.hits + '</b><small>' + T('ударов сделано', 'hits made') + '</small></div><div class="tc"><b>' + per.toFixed(1) + '</b><small>' + T('урон за удар', 'damage per hit') + '</small></div><div class="tc"><b>' + num(left) + '</b><small>' + T('ударов осталось', 'hits left') + '</small></div>'
      + (w.kind === 'm' ? '<div class="tc"><b>' + fmtTime(SM.time) + '</b><small>' + T('времени прошло', 'time spent') + '</small></div><div class="tc"><b>' + tools + '</b><small>' + T('инструментов износилось', 'tools worn out') + '</small></div>'
        : '<div class="tc"><b>' + num(sulfur) + '</b><small>' + T('серы потрачено', 'sulfur spent') + '</small></div>') + '</div>'
      + (SM.hp <= 0 ? '<div class="tnote"><b>' + T('Стена разрушена!', 'The wall is down!') + '</b> ' + T('Ушло ударов: ', 'Hits used: ') + SM.hits + (w.kind === 'x' && SM.hits ? '. ' + T('Это сырья на ', 'Raw materials: ') + '</div>' + rawHtml(r) : '</div>') : '');
  }
  function smHit() {
    if (SM.hp <= 0) { smStop(); return; }
    const w = smWeapon(), per = effective(targetOf().prot, w.damage);
    if (per <= 0.0001) { smStop(); smPaint(true); return; }
    SM.hp = Math.max(0, SM.hp - per); SM.dealt += per; SM.hits++; SM.time += w.kind === 'm' ? w.delay : 0;
    smPaint(true);
    if (SM.hp <= 0) { smStop(); const a = document.getElementById('smAuto'); if (a) a.classList.remove('on'); }
  }
  function smToggleAuto() {
    const a = document.getElementById('smAuto');
    if (SM.auto) { smStop(); if (a) a.classList.remove('on'); return; }
    if (SM.hp <= 0) smReset();
    SM.auto = setInterval(smHit, 220);
    if (a) a.classList.add('on');
  }

  /* ---------- screen ---------- */
  const PANEL = {
    smash: [smashForm, () => ''], raid: [raidForm, raidRes], eco: [raidForm, ecoRes], wall: [wallForm, wallRes], decay: [decayForm, decayRes],
    codes: [codesForm, codesRes], mine: [mineForm, mineRes], genes: [genesForm, genesRes],
  };
  const INTRO = {
    smash: ['Выбери стену и чем её бить, жми на стену и смотри, сколько она держится и что на это уйдёт.', 'Pick a wall and what to hit it with, click the wall and see how long it holds and what it costs.'],
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
    if (S.tab !== 'smash') smStop();
    box.innerHTML = '<p class="mut" style="margin:0 0 14px">' + T(INTRO[S.tab][0], INTRO[S.tab][1]) + '</p>' + form();
    results();
    if (S.tab === 'smash') smPaint(false);
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
    if ((b = e.target.closest('[data-tadd]'))) { const id = b.dataset.tadd, ex = S.base.find((x) => x.id === id); if (ex) ex.qty = Math.min(999, ex.qty + 1); else S.base.push({ id, qty: 1, hp: 0 }); saveBase(); const l = document.getElementById('tlBase'); if (l) l.innerHTML = baseListHtml(); results(); return; }
    if ((b = e.target.closest('[data-tdel]'))) { S.base.splice(+b.dataset.tdel, 1); cleanBase(); saveBase(); const l = document.getElementById('tlBase'); if (l) l.innerHTML = baseListHtml(); results(); return; }
    if ((b = e.target.closest('[data-tmulrow]'))) { const x = S.base[+b.dataset.tmulrow]; x.qty = Math.min(999, x.qty * 2); saveBase(); const l = document.getElementById('tlBase'); if (l) l.innerHTML = baseListHtml(); results(); return; }
    if (e.target.closest('[data-tclear]')) { S.base = [{ id: 'tier:stone', qty: 1, hp: 0 }]; saveBase(); draw(); return; }
    if (e.target.closest('[data-tlink]')) { const url = location.href.split('#')[0] + '#tools?b=' + encodeURIComponent(S.base.map((x) => x.id + '*' + x.qty + '*' + x.hp).join(',')); try { navigator.clipboard.writeText(url); } catch (err) { /* no clipboard */ } const m = document.getElementById('tlMsg'); if (m) m.textContent = T('Ссылка скопирована', 'Link copied'); return; }
    if ((b = e.target.closest('[data-tshow]'))) { S.show = b.dataset.tshow; results(); return; }
    if ((b = e.target.closest('[data-tsort]'))) { S.sort = b.dataset.tsort; results(); return; }
    if (e.target.closest('[data-smhit]') || e.target.closest('#smWall')) { smHit(); return; }
    if (e.target.closest('[data-smauto]')) { smToggleAuto(); return; }
    if (e.target.closest('[data-smreset]')) { smReset(); smPaint(false); const a = document.getElementById('smAuto'); if (a) a.classList.remove('on'); return; }
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
      if (e.type === 'change' && (k === 'mine' || k === 'target' || k === 'tool' || k === 'codeN' || k === 'codeHot' || k === 'smw' || k === 'smhp')) { if (k === 'codeN' || k === 'codeHot') nextBatch(); if (k === 'smw' || k === 'smhp' || k === 'target') smReset(); draw(); return; }
      results(); return;
    }
    const bf = e.target.closest('[data-tb]');
    if (bf) { const [i, k] = bf.dataset.tb.split(':'), x = S.base[+i]; if (x) { x[k] = Math.max(k === 'qty' ? 1 : 0, Math.min(k === 'qty' ? 999 : 100000, Math.round(+bf.value || 0))); saveBase(); results(); } return; }
    const g = e.target.closest('[data-tg]');
    if (g) { S.genes[+g.dataset.tg] = g.value; results(); }
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
})();
