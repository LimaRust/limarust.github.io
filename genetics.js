/* Genetics page: plants (planting plan, cross result, what a clone gives) and livestock (the in-game genome panel, child chances, best pair).
   Every rule here was read from the game code of our server and checked against it (tools/site-data, plugins LimaWikiRaid and LimaWikiAnimals). */
(function () {
  'use strict';
  const T = (ru, en) => (LANG === 'en' ? en : ru);
  const D = { raid: null, animals: null, failed: false, loading: false };
  const blank = () => ({ sp: 'cow', sex: 'F', name: '', g: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], m: [0, 1] });
  const G = {
    tab: 'plants', pmode: 'plan', amode: 'herd', sel: -1, editIdx: -1, nameq: '', dynq: '', nameLoc: 'en', pplay: {}, plan: { sp: 'cow', k: 3, genes: [true, true, true, true, true] }, crop: 'red_berry', target: 'GGGYYY', custom: '', inv: {}, neigh: ['', '', '', '', '', '', '', ''], own: '', layout: 'large',
    one: blank(), mother: Object.assign(blank(), { sex: 'F', m: [3, 5] }), father: Object.assign(blank(), { sex: 'M', m: [8, 9] }), herd: [], draft: blank(), goal: 'all',
  };
  try { G.inv = JSON.parse(localStorage.getItem('lima.gene.inv') || '{}'); G.herd = JSON.parse(localStorage.getItem('lima.gene.herd2') || '[]'); } catch (e) { G.inv = {}; G.herd = []; }
  const save = () => { try { localStorage.setItem('lima.gene.inv', JSON.stringify(G.inv)); localStorage.setItem('lima.gene.herd2', JSON.stringify(G.herd)); } catch (e) { /* private mode */ } };
  const num1 = (n, d = 1) => (Number.isFinite(n) ? n.toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: d }) : '∞');
  const fmtSec = (s) => {
    s = Math.round(s);
    if (s < 90) return s + ' ' + T('с', 's');
    if (s < 5400) return Math.round(s / 60) + ' ' + T('мин', 'min');
    if (s < 172800) return num1(s / 3600, 1) + ' ' + T('ч', 'h');
    return num1(s / 86400, 1) + ' ' + T('дн', 'd');
  };

  /* =====================================================  PLANTS  ===================================================== */
  const CROPS = [
    ['red_berry', 'Красные ягоды', 'Red berries'], ['blue_berry', 'Синие ягоды', 'Blue berries'], ['yellow_berry', 'Жёлтые ягоды', 'Yellow berries'], ['green_berry', 'Зелёные ягоды', 'Green berries'],
    ['white_berry', 'Белые ягоды', 'White berries'], ['black_berry', 'Чёрные ягоды', 'Black berries'], ['hemp', 'Конопля', 'Hemp'], ['potato', 'Картофель', 'Potato'], ['pumpkin', 'Тыква', 'Pumpkin'],
    ['corn', 'Кукуруза', 'Corn'], ['wheat', 'Пшеница', 'Wheat'], ['orchid', 'Орхидея', 'Orchid'], ['rose', 'Роза', 'Rose'], ['sunflower', 'Подсолнух', 'Sunflower'],
  ];
  const CROP_EMOJI = { red_berry: '🍓', blue_berry: '🫐', yellow_berry: '🍋', green_berry: '🍏', white_berry: '🤍', black_berry: '🖤', hemp: '🌿', potato: '🥔', pumpkin: '🎃', corn: '🌽', wheat: '🌾', orchid: '🌺', rose: '🌹', sunflower: '🌻' };
  // the picture of every crop is the real item icon of the game (clone and what it gives)
  const CLONE_IC = { red_berry: 'clone.red.berry', blue_berry: 'clone.blue.berry', yellow_berry: 'clone.yellow.berry', green_berry: 'clone.green.berry', white_berry: 'clone.white.berry', black_berry: 'clone.black.berry', hemp: 'clone.hemp', potato: 'clone.potato', pumpkin: 'clone.pumpkin', corn: 'clone.corn', wheat: 'clone.wheat', orchid: 'clone.orchid', rose: 'clone.rose', sunflower: 'clone.sunflower' };
  const FRUIT_IC = { red_berry: 'red.berry', blue_berry: 'blue.berry', yellow_berry: 'yellow.berry', green_berry: 'green.berry', white_berry: 'white.berry', black_berry: 'black.berry', hemp: 'cloth', potato: 'potato', pumpkin: 'pumpkin', corn: 'corn', wheat: 'wheat', orchid: 'orchid', rose: 'rose', sunflower: 'sunflower' };
  const itemImg = (sn, cls, emoji) => '<img class="' + (cls || 'gim') + '" src="' + itemIc(sn) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<em class=&quot;ce&quot;>' + (emoji || '🌱') + '</em>\'">';
  const cropIcon = (id) => itemImg(CLONE_IC[id] || id, 'gim', CROP_EMOJI[id]);
  const cropName = (id) => { const c = CROPS.find((x) => x[0] === id) || CROPS[0]; return T(c[1], c[2]); };
  const GENES = { G: ['Рост', 'Growth', 'Быстрее растёт: +25% к скорости за каждый ген.', 'Grows faster: +25% speed for every gene.'], Y: ['Урожай', 'Yield', 'Больше плодов (+25% за ген) и больше клонов (каждые два гена дают +1).', 'More fruit (+25% per gene) and more clones (every two genes give +1).'], H: ['Стойкость', 'Hardiness', 'Лучше переносит холод и жару (+5% к климату и +20% к почве за ген).', 'Handles cold and heat better (+5% climate and +20% ground per gene).'], W: ['Вода', 'Water', 'Тратит больше воды: +10% за каждый ген.', 'Uses more water: +10% for every gene.'], X: ['Пусто', 'Empty', 'Ничего не даёт.', 'Does nothing.'] };
  const PRESETS = [['GGGYYY', 'Мета: баланс', 'Meta: balanced', 'Лучший выбор для ягод, ткани и еды.', 'The best choice for berries, cloth and food.'], ['GGGGYY', 'Турбо-рост', 'Turbo growth', 'Много сборов за короткое время.', 'Many harvests in a short time.'], ['YYYYGG', 'Макс. урожай', 'Max yield', 'Дольше растёт, зато больше за раз.', 'Slower, but more at once.'], ['HHHGGG', 'Выживальщик', 'Survivor', 'Для холодных биомов без отопления.', 'For cold biomes without heating.']];
  const plant = () => (D.raid.plants.find((p) => p.id === G.crop) || D.raid.plants[0]);
  const WEIGHT = () => { const w = plant().weights; return { X: w[0], W: w[1], G: w[2], Y: w[3], H: w[4] }; };
  const valid = (s) => /^[GYHWX]{6}$/.test(s);
  const clean = (s) => String(s || '').toUpperCase().replace(/[^GYHWX]/g, '');
  const letters = (code, target) => [...code].map((c, i) => '<b class="gl g' + c + (target && target[i] === c ? ' hit' : '') + '">' + c + '</b>').join('');
  const stagesOf = () => (plant().stages || []);
  const crossBase = () => stagesOf().slice(0, 3).reduce((s, x) => s + (x.seconds || 0), 0) || 1260;
  const cloneCount = (code) => ((plant().props || {}).BaseCloneCount ?? 2) + Math.floor([...code].filter((c) => c === 'Y').length / 2);

  // the game's own rule (GrowableGenetics.CrossBreed): the plant looks at neighbours, adds their weights per slot, the heaviest gene wins,
  // and it replaces the plant's own gene only when it is strictly heavier than the weight of that own gene
  function cross(list, own) {
    const w = WEIGHT(), slots = [];
    let code = '';
    for (let i = 0; i < 6; i++) {
      const sum = {};
      let domT = null, domW = 0;
      list.forEach((g) => { const c = g[i]; sum[c] = (sum[c] || 0) + w[c]; if (sum[c] > domW + 1e-9) { domW = sum[c]; domT = c; } });
      const max = Math.max(...Object.values(sum)), win = Object.keys(sum).filter((k) => Math.abs(sum[k] - max) < 1e-9), mine = own ? own[i] : null;
      const kept = !!mine && !(domW > w[mine] + 1e-9);
      code += kept ? mine : domT;
      slots.push({ sum, win, mine, kept });
    }
    return { code, slots };
  }

  // what a clone does: every number is the rule of the game code, the crop gives the base values
  function effectsOf(code) {
    const c = { G: 0, Y: 0, H: 0, W: 0, X: 0 };
    [...code].forEach((x) => { if (c[x] !== undefined) c[x]++; });
    const P = plant(), E = P.entity || {}, pr = P.props || {};
    const gs = E.growthGeneSpeedMultiplier ?? 0.25, ws = E.waterGeneRequirementMultiplier ?? 0.1, ys = E.yieldGeneBonusMultiplier ?? 0.25, hg = E.hardinessGeneModifierBonus ?? 0.2, ht = E.hardinessGeneTemperatureModifierBonus ?? 0.05;
    const speed = 1 + c.G * gs, stg = (P.stages || []).slice(0, 6), secs = stg.reduce((s, x, i) => s + (i === 3 ? 0 : (x.seconds || 0)), 0) + 0, fixed = stg[3] ? (stg[3].seconds || 0) : 0; // the crossbreed stage ignores growth conditions
    const ripeStage = (P.stages || [])[5];
    const pos = c.G + c.Y + c.H, neg = c.W + c.X;
    return {
      counts: c, speed, ripe: secs / speed + fixed, water: 1 + c.W * ws, yieldMul: 1 + c.Y * ys, clones: (pr.BaseCloneCount ?? 2) + Math.floor(c.Y / 2), temp: c.H * ht, ground: c.H * hg,
      market: Math.max(0, (pr.BaseMarketValue ?? 10) + pos * 10 - neg * 10), ripeYield: ripeStage ? ripeStage.yield : null,
    };
  }
  function effectsHtml(code, title) {
    if (!valid(code)) return '';
    const e = effectsOf(code), P = plant();
    return '<div class="card geff"><h4>' + (title || T('Что даёт такой клон', 'What such a clone gives')) + ' ' + letters(code) + '</h4><div class="tgrid4">'
      + '<div class="tc"><b>×' + num1(e.speed, 2) + '</b><small>' + T('скорость роста', 'growth speed') + '</small></div>'
      + '<div class="tc"><b>' + fmtSec(e.ripe) + '</b><small>' + T('до спелости (от семени)', 'until ripe (from seed)') + '</small></div>'
      + '<div class="tc"><b>×' + num1(e.yieldMul, 2) + '</b><small>' + T('урожай', 'harvest') + '</small></div>'
      + '<div class="tc"><b>' + e.clones + '</b><small>' + T('клонов со взрослого растения', 'clones from one plant') + '</small></div>'
      + '<div class="tc"><b>×' + num1(e.water, 2) + '</b><small>' + T('расход воды', 'water use') + '</small></div>'
      + '<div class="tc"><b>+' + Math.round(e.temp * 100) + '% / +' + Math.round(e.ground * 100) + '%</b><small>' + T('климат / почва (стойкость)', 'climate / ground (hardiness)') + '</small></div>'
      + '<div class="tc"><b>' + e.market + '</b><small>' + T('цена семян у торговцев (база ' + (P.props?.BaseMarketValue ?? 10) + ')', 'seed trade value (base ' + (P.props?.BaseMarketValue ?? 10) + ')') + '</small></div></div></div>';
  }

  /* ---------- planters ----------
     The slots are the PlanterSlot points of the planter prefabs of the game (x, z in metres, measured on our server).
     The game lets a plant cross only with plants of the same planter and the same crop that stand closer than 1.5 m (GrowableGenetics.CrossBreed).
     The plant looks at its neighbours once, when it enters the Crossbreed stage; a neighbour counts from the moment it is planted, whatever its stage is. */
  const R_NEI = 1.5;
  const LAYOUTS = {
    large: { n: ['Большая грядка · 9 мест', 'Large planter · 9 spots'], item: 'planter.large', W: 2.84, H: 2.86, shape: 'rect', pts: [[0, 0], [0.92, 0], [-0.92, 0], [-0.92, 0.9], [0.94, 0.9], [0, 0.9], [0, -0.95], [0.94, -0.95], [-0.92, -0.95]], d: ['Сетка 3 × 3. В центре растение-цель: ему доступны все 8 соседей. Угол видит 3 соседа, край видит 5.', 'A 3 × 3 grid. The target is in the middle: it reaches all 8 neighbours. A corner reaches 3, a side spot reaches 5.'] },
    small: { n: ['Одиночная грядка · 3 места', 'Single planter · 3 spots'], item: 'planter.small', W: 2.84, H: 1.0, shape: 'rect', pts: [[0, 0], [0.92, 0], [-0.92, 0]], d: ['Линия из трёх. Цель посередине, по бокам два соседа. Крайние растения друг до друга не достают.', 'A line of three. The target is in the middle with a neighbour on each side. The end plants do not reach each other.'] },
    tri: { n: ['Треугольная грядка · 4 места', 'Triangle planter · 4 spots'], item: 'planter.triangle', W: 2.2, H: 2.5, shape: 'tri', pts: [[0.36, 0], [0.66, 0.49], [0.65, -0.49], [-0.21, 0]], d: ['Четыре места, все растения достают друг до друга. Цель в середине, три соседа вокруг.', 'Four spots and every plant reaches every other. The target is in the middle with three neighbours.'] },
    tub: { n: ['Ванна-грядка · 3 места', 'Bath tub planter · 3 spots'], item: 'bathtub.planter', W: 2.77, H: 1.23, shape: 'rect', pts: [[0, 0], [0.98, 0], [-0.98, 0]], d: ['Как одиночная грядка: цель посередине, два соседа по бокам.', 'Like the single planter: the target in the middle, a neighbour on each side.'] },
    cart: { n: ['Вагонетка-грядка · 2 места', 'Minecart planter · 2 spots'], item: 'minecart.planter', W: 1.6, H: 1.0, shape: 'rect', pts: [[0.46, 0], [-0.46, 0]], d: ['Два места рядом: одно растение-цель и один сосед.', 'Two spots side by side: one target and one neighbour.'] },
  };
  const nbCache = {};
  const neigh = (key) => {
    if (nbCache[key]) return nbCache[key];
    const p = LAYOUTS[key].pts;
    return (nbCache[key] = p.map((a, i) => p.map((b, j) => j).filter((j) => j !== i && Math.hypot(a[0] - p[j][0], a[1] - p[j][1]) <= R_NEI + 1e-6)));
  };
  const where = (L, i) => {
    const [x, y] = L.pts[i];
    if (i === 0) return T('центр', 'middle');
    if (L.shape === 'tri') return T('угол', 'corner');
    const v = y < -0.2 ? T('сверху', 'top') : y > 0.2 ? T('снизу', 'bottom') : '', h = x < -0.2 ? T('слева', 'left') : x > 0.2 ? T('справа', 'right') : '';
    const kind = v && h ? T('угол', 'corner') : T('край', 'side');
    return kind + ' · ' + [v, h].filter(Boolean).join(' ');
  };

  /* ---------- timing: every plant ages with the factor (quality x (1 + 0.25 per G gene)) and crosses once, when its age reaches the end of the sapling stage ---------- */
  const SAFE = 240; // seconds: donors are planted so that they cross at least this long after the target
  const rateOf = (code) => 1 + 0.25 * [...code].filter((c) => c === 'G').length;
  // codes[0] is the target (planted first), the rest are donors: each is planted late enough to cross SAFE seconds after the target
  function schedule(codes) {
    const cb = crossBase(), Tc = cb / rateOf(codes[0]);
    return codes.map((c, i) => (i && c ? Math.max(0, Tc + SAFE - cb / rateOf(c)) : 0));
  }
  const plantRank = (start) => start.map((s, i) => i).sort((a, b) => start[a] - start[b] || a - b);
  // the game's rule for one slot: the neighbours are walked in the order of the planter children (the order of planting)
  function crossSlot(list, own, w) {
    const sum = {};
    let domT = null, domW = 0;
    list.forEach((c) => { sum[c] = (sum[c] || 0) + w[c]; if (sum[c] > domW + 1e-9) { domW = sum[c]; domT = c; } });
    const tie = Object.values(sum).filter((v) => Math.abs(v - domW) < 1e-9).length > 1;
    return domT && domW > w[own] + 1e-9 ? { c: domT, tie } : { c: own, tie: false };
  }
  // the target after the crossing: donors = every other slot (all are within 1.5 m of the target in every planter)
  function centreResult(center, donors, start) {
    const w = WEIGHT(), rank = plantRank(start);
    const list = rank.filter((i) => i > 0 && donors[i - 1]).map((i) => donors[i - 1]);
    let code = '', tie = false;
    for (let s = 0; s < 6; s++) { const r = crossSlot(list.map((d) => d[s]), center[s], w); code += r.c; if (r.tie) tie = true; }
    return { code, tie };
  }
  // the whole planter over time (the other plants cross later and see the new genes of the target)
  function simulate(key, codes, start, Q) {
    const nb = neigh(key), w = WEIGHT(), cb = crossBase(), N = codes.length, q = Q || 1;
    const g = codes.map((c) => (c ? [...c] : null)), T0 = codes.map((c, i) => (c ? start[i] + cb / (q * rateOf(c)) : Infinity)), rank = plantRank(start), pos = [];
    rank.forEach((i, k) => (pos[i] = k));
    const unc = new Array(N).fill(false);
    codes.map((c, i) => i).filter((i) => g[i]).sort((a, b) => T0[a] - T0[b] || pos[a] - pos[b]).forEach((i) => {
      const list = nb[i].filter((j) => g[j] && start[j] <= T0[i] + 1e-9).sort((a, b) => pos[a] - pos[b]);
      for (let s = 0; s < 6; s++) { const r = crossSlot(list.map((j) => g[j][s]), g[i][s], w); g[i][s] = r.c; if (r.tie) unc[i] = true; }
    });
    return { genes: g.map((a) => (a ? a.join('') : null)), unc, T: T0 };
  }
  const matchesOf = (a, b) => [...a].filter((c, i) => c === b[i]).length;
  const scoreOf = (code, target, tie) => { let good = 0; for (let i = 0; i < 6; i++) if ('GYH'.includes(code[i])) good++; return matchesOf(code, target) * 100 + good * 2 - (tie ? 5 : 0); };

  // exact search: which clone goes to the middle and which donors around it (every combination of the best clone types is checked)
  function optimise(key, inv, target) {
    const L = LAYOUTS[key], D = L.pts.length - 1, w = WEIGHT();
    const types = Object.keys(inv).filter((c) => inv[c] > 0).sort((a, b) => matchesOf(b, target) - matchesOf(a, target) || [...b].filter((c) => 'GYH'.includes(c)).length - [...a].filter((c) => 'GYH'.includes(c)).length).slice(0, 10);
    if (!types.length) return null;
    let best = null, evals = 0;
    const all = new Map();
    for (const C of types) {
      if (inv[C] < 1) continue;
      const left = Object.assign({}, inv);
      left[C]--;
      const cur = [];
      const dfs = (i) => {
        if (evals > 600000) return;
        if (i === types.length) {
          evals++;
          const codes = [C].concat(cur, new Array(D - cur.length).fill(null)), st = schedule(codes), r = centreResult(C, codes.slice(1), st), s = scoreOf(r.code, target, r.tie) - cur.length * 0.01;
          const cand = { s, codes, start: st, res: r };
          if (!best || s > best.s) best = cand;
          const old = all.get(r.code);
          if (!old || s > old.s) all.set(r.code, cand);
          return;
        }
        const t = types[i], max = Math.min(D - cur.length, left[t] || 0);
        for (let n = max; n >= 0; n--) { for (let k = 0; k < n; k++) cur.push(t); left[t] -= n; dfs(i + 1); left[t] += n; cur.length -= n; }
      };
      dfs(0);
    }
    if (best) best.all = [...all.values()].sort((a, b) => b.s - a.s);
    return best;
  }
  // down to which quality of light, water and ground the same forecast stays true
  function minQuality(key, b) {
    let ok = 1;
    for (let q = 1; q >= 0.4; q -= 0.05) { const r = simulate(key, b.codes, b.start, q); if (r.genes[0] !== b.res.code) break; ok = q; }
    return ok;
  }
  function mkRound(key, b, target) {
    const st3 = (stagesOf()[3] || {}).seconds || 300, sim = simulate(key, b.codes, b.start, 1), Tc = sim.T[0], f = b.res.code;
    return { codes: b.codes, start: b.start, genes: sim.genes, tie: b.res.tie, tCross: Tc, tClone: Tc + st3, qmin: minQuality(key, b), final: f, matches: matchesOf(f, target) };
  }
  function buildPlan(key, inv0, target) {
    const inv = Object.assign({}, inv0), rounds = [], st = stagesOf(), st3 = (st[3] || {}).seconds || 300;
    let bestS = -1e9;
    for (let r = 0; r < 6; r++) {
      Object.keys(inv).forEach((c) => { if (inv[c] <= 0) delete inv[c]; });
      const b = optimise(key, inv, target);
      if (!b) break;
      const f = b.res.code, sc = scoreOf(f, target, b.res.tie);
      if (r > 0 && sc <= bestS) break;
      bestS = sc;
      const rd = mkRound(key, b, target);
      if (r === 0) rd.all = b.all;
      rounds.push(rd);
      b.codes.forEach((c) => { if (c) inv[c]--; });
      inv[f] = (inv[f] || 0) + cloneCount(f);
      if (matchesOf(f, target) === 6) break;
    }
    return rounds;
  }
  // the picture of a planter: soil, the 1.5 m circle of the target, numbered spots with their genes
  const boxHtml = (key, codes, target) => {
    const L = LAYOUTS[key], px = (x) => ((x + L.W / 2) / L.W * 100).toFixed(2), py = (y) => ((y + L.H / 2) / L.H * 100).toFixed(2);
    return '<div class="gbox gb-' + L.shape + '" style="aspect-ratio:' + L.W + '/' + L.H + '"><span class="gsoil"></span>'
      + '<i class="grad" style="left:' + px(L.pts[0][0]) + '%;top:' + py(L.pts[0][1]) + '%;width:' + (2 * R_NEI / L.W * 100).toFixed(1) + '%;height:' + (2 * R_NEI / L.H * 100).toFixed(1) + '%"></i>'
      + L.pts.map((p, i) => '<div class="gspot' + (i === 0 ? ' tgt' : '') + (codes && !codes[i] ? ' emp' : '') + '" style="left:' + px(p[0]) + '%;top:' + py(p[1]) + '%"><em>' + (i + 1) + '</em>' + (codes && codes[i] ? '<span>' + letters(codes[i], i === 0 ? target : null) + '</span>' : '') + '</div>').join('') + '</div>';
  };
  const miniHtml = (key) => {
    const L = LAYOUTS[key];
    return '<span class="gmini gb-' + L.shape + '" style="aspect-ratio:' + L.W + '/' + L.H + '">' + L.pts.map((p, i) => '<i class="' + (i === 0 ? 'tg' : '') + '" style="left:' + ((p[0] + L.W / 2) / L.W * 100).toFixed(1) + '%;top:' + ((p[1] + L.H / 2) / L.H * 100).toFixed(1) + '%"></i>').join('') + '</span>';
  };

  const stageHtml = () => {
    const P = plant(), names = [['Семя', 'Seed'], ['Рассада', 'Seedling'], ['Саженец (можно брать клон)', 'Sapling (clones can be taken)'], ['Скрещивание (клон брать нельзя)', 'Crossbreeding (no clones now)'], ['Взросление (можно брать клон)', 'Mature (clones can be taken)'], ['Плодоношение', 'Fruiting'], ['Спелость (собирай)', 'Ripe (harvest)'], ['Умирание', 'Dying']];
    return '<div class="ghow"><h4>' + T('Стадии растения', 'Plant stages') + ' · ' + cropName(G.crop) + '</h4><div class="gstages">' + (P.stages || []).map((s, i) => '<div class="gstg"><b>' + (i + 1) + '</b><span>' + T(names[i][0], names[i][1]) + '</span><small>' + fmtSec(s.seconds) + '</small></div>').join('') + '</div><p class="mut">' + T('Времена даны при идеальных условиях (свет, вода, почва 100%) и без генов роста: каждый ген G ускоряет рост на 25%. Стадия «Скрещивание» идёт строго по часам, условия и гены на неё не влияют. Растение смотрит на соседей и меняет свои гены один раз, в начале стадии «Скрещивание».', 'Times are for ideal conditions (light, water, ground at 100%) and without growth genes: every G gene speeds growth by 25%. The crossbreeding stage runs strictly by the clock, conditions and genes do not affect it. The plant looks at its neighbours and changes its own genes once, at the start of the crossbreeding stage.') + '</p></div>';
  };
  const howHtml = () => '<div class="ghow"><h4>' + T('Как работает скрещивание', 'How crossbreeding works') + '</h4><p class="mut">' + T('Растение смотрит на соседей, которые стоят ближе 1.5 м в той же грядке и такой же культуры. В каждой из 6 ячеек веса генов соседей складываются, и самый тяжёлый побеждает. Зелёные G, Y, H весят 0.6, красные W и X весят 1. Свой ген растение меняет, только если победитель строго тяжелее его: свой красный ген (1.0) заменят два зелёных соседа (1.2), а один зелёный не заменит.', 'The plant looks at neighbours closer than 1.5 m in the same planter with the same crop. In each of the 6 slots the weights of the neighbours are added and the heaviest wins. Green G, Y, H weigh 0.6, red W and X weigh 1. The plant replaces its own gene only if the winner is strictly heavier: its own red gene (1.0) is replaced by two green neighbours (1.2), one green does not replace it.') + '</p><div class="gkey">' + Object.entries(GENES).map(([k, v]) => '<div><b class="gl g' + k + '">' + k + '</b> <b>' + T(v[0], v[1]) + '</b><small>' + T(v[2], v[3]) + '</small></div>').join('') + '</div></div>';

  /* ---------- page parts for beginners ---------- */
  const introHtml = () => {
    const steps = [
      [CLONE_IC[G.crop], T('Возьми клоны', 'Get clones'), T('Срежь клон с растения (кнопка «Взять клон»). У каждого клона 6 букв генов: наведи на растение и прочитай.', 'Cut a clone from a plant. Every clone has 6 gene letters: look at the plant and read them.')],
      ['tool.camera', T('Впиши буквы', 'Enter the letters'), T('Напиши 6 букв клона или включи «Сканер экрана»: он сам прочитает буквы с игры.', 'Type the 6 letters of the clone or turn on the screen scanner: it reads the letters from the game.')],
      ['planter.large', T('Выбери грядку и цель', 'Pick a planter and a goal'), T('Какая грядка у тебя есть и какие гены хочешь получить.', 'Which planter you have and the genes you want.')],
      ['seed.' + (CLONE_IC[G.crop] || '').replace('clone.', ''), T('Сажай по схеме', 'Plant as shown'), T('Сайт скажет: в точку 1 такой клон, в точку 2 такой. И сколько ждать.', 'The site says: this clone into spot 1, this one into spot 2. And how long to wait.')],
      ['scissors', T('Забери клон и повтори', 'Take a clone and repeat'), T('Когда время вышло, возьми клон с растения в точке 1. Он уже с новыми генами. Повторяй круги, пока не получишь цель.', 'When the time is up, take a clone from spot 1. It has the new genes. Repeat the rounds until you reach the goal.')],
    ];
    return '<div class="gintro">' + steps.map((s, i) => '<div class="gi1"><b class="gno">' + (i + 1) + '</b>' + itemImg(s[0], 'gim', ['🌱', '🔍', '🧺', '🪴', '✂️'][i]) + '<span><b>' + s[1] + '</b><small>' + s[2] + '</small></span></div>').join('') + '</div>';
  };
  /* ---------- the knowledge base: question and answer, every answer says where it comes from ---------- */
  const faq = (items) => '<div class="gfaq">' + items.map(([q, a, v]) => '<details><summary><span class="gv v' + v + '">' + (v === 'g' ? '✓ ' + T('код игры', 'game code') : '🔎 ' + T('сообщество', 'community')) + '</span>' + q + '</summary><div>' + a + '</div></details>').join('') + '</div>';
  function faqPlants() {
    const st = stagesOf(), cb = crossBase(), st3 = (st[3] || {}).seconds || 300, w = WEIGHT();
    return '<div class="ghow"><h4>' + T('Вопросы и ответы по растениям', 'Questions and answers about plants') + '</h4>' + faq([
      [T('Сколько мест в каждой грядке?', 'How many spots does each planter have?'), T('Большая грядка 9 мест (сетка 3 × 3). Одиночная 3 места в линию. Треугольная 4 места. Ванна-грядка 3 места, вагонетка 2 места. Места взяты из самой игры: у каждой грядки есть точки посадки (PlanterSlot), мы измерили их на сервере.', 'Large planter 9 spots (a 3 × 3 grid). Single planter 3 spots in a line. Triangle planter 4 spots. Bath tub planter 3 spots, minecart planter 2 spots. The spots come from the game: every planter has planting points (PlanterSlot) that we measured on the server.'), 'g'],
      [T('Какое расстояние нужно для скрещивания?', 'How close must the plants be to cross?'), T('Меньше 1.5 м и только в одной грядке. В большой грядке центр достаёт до всех 8 соседей, край до 5, угол до 3. В одиночной грядке центр достаёт до двух, крайние друг до друга нет (1.84 м). В треугольной все четыре растения достают друг до друга.', 'Closer than 1.5 m and only inside one planter. In the large planter the middle reaches all 8 neighbours, a side spot reaches 5, a corner 3. In the single planter the middle reaches two and the ends do not reach each other (1.84 m). In the triangle planter all four reach each other.'), 'g'],
      [T('Только растения одной культуры?', 'Only plants of the same crop?'), T('Да. Красные ягоды видят только красные ягоды. Растения другой культуры в грядке не мешают и не помогают.', 'Yes. Red berries see only red berries. Plants of another crop in the planter neither help nor hurt.'), 'g'],
      [T('Должны ли соседи быть взрослыми?', 'Do the neighbours have to be mature?'), T('Нет. Игра берёт любое живое растение этой культуры в грядке, даже только что посаженное семя. Некоторые сайты пишут, что соседи должны быть взрослыми: в этой версии игры такого условия нет, мы проверили настоящий код игры.', 'No. The game takes any living plant of this crop in the planter, even a freshly planted seed. Some sites say the neighbours must be mature: this version of the game has no such condition, we checked the real game code.'), 'g'],
      [T('Пустое место считается как ген X?', 'Does an empty spot count as an X gene?'), T('Нет. Пустое место ничего не добавляет. Считаются только настоящие растения. Некоторые гайды пишут обратное, но это неверно.', 'No. An empty spot adds nothing. Only real plants count. Some guides say the opposite, that is wrong.'), 'g'],
      [T('Как считается победитель в ячейке?', 'How is the winner of a slot chosen?'), T('Веса соседей по этой ячейке складываются по типам генов: G, Y, H по ' + w.G + ', W и X по ' + w.W + '. Побеждает тип с наибольшей суммой. Растение меняет свой ген, только если сумма победителя строго больше веса его собственного гена. Один зелёный (' + w.G + ') не заменит чужой красный (' + w.W + '), два зелёных (' + (2 * w.G).toFixed(1) + ') заменят.', 'The weights of the neighbours in this slot are added by gene type: G, Y, H ' + w.G + ' each, W and X ' + w.W + ' each. The type with the biggest sum wins. The plant replaces its own gene only if the winner sum is strictly bigger than the weight of its own gene. One green (' + w.G + ') does not replace a red (' + w.W + '), two greens (' + (2 * w.G).toFixed(1) + ') do.'), 'g'],
      [T('Что при равенстве?', 'What happens on a tie?'), T('Игра обходит соседей в порядке их посадки в грядку и оставляет тот тип, который первым набрал наибольшую сумму. Поэтому при равенстве выигрывает сосед, посаженный раньше. Это не случайность: сажай строго по списку сайта.', 'The game walks the neighbours in the order they were planted and keeps the type that reached the biggest sum first. So on a tie the neighbour planted earlier wins. It is not random: plant exactly as the site lists.'), 'g'],
      [T('Когда растение скрещивается?', 'When does the plant cross?'), T('Один раз, в момент, когда оно входит в стадию «Скрещивание» (после «Саженца»). Без генов роста и при идеальных условиях это через ' + fmtSec(cb) + ' после посадки. Больше оно гены не меняет.', 'Once, at the moment it enters the Crossbreeding stage (after Sapling). Without growth genes and with ideal conditions that is ' + fmtSec(cb) + ' after planting. It does not change genes again.'), 'g'],
      [T('Как гены и условия влияют на время?', 'How do genes and conditions affect the time?'), T('Возраст растёт со скоростью «качество условий × (1 + 0.25 × число G)». Качество это свет, вода, почва и температура. Стадия «Скрещивание» от условий и генов не зависит: она идёт ровно ' + fmtSec(st3) + '.', 'The age grows at the speed "quality of conditions × (1 + 0.25 × number of G)". Quality is light, water, ground and temperature. The Crossbreeding stage does not depend on conditions or genes: it lasts exactly ' + fmtSec(st3) + '.'), 'g'],
      [T('Зачем сажать соседей позже?', 'Why plant the neighbours later?'), T('Каждый сосед тоже скрещивается и меняет свои гены. Если сосед скрестится раньше цели, цель увидит его уже изменённым, и прогноз собьётся. Поэтому сначала сажается цель, а соседи с быстрым ростом позже: так они гарантированно скрещиваются после цели (запас ' + fmtSec(SAFE) + ').', 'Every neighbour crosses too and changes its genes. If a neighbour crosses before the target, the target sees it already changed and the forecast breaks. So the target goes first and the fast growing neighbours later: they are sure to cross after the target (a margin of ' + fmtSec(SAFE) + ').'), 'g'],
      [T('Когда можно взять клон?', 'When can a clone be taken?'), T('На стадии «Саженец» (гены ещё старые) и начиная со стадии «Взросление» (гены уже новые). Во время «Скрещивание» нельзя. Когда берёшь клон, растение исчезает.', 'At the Sapling stage (genes still old) and from the Mature stage (genes new). Not during Crossbreeding. When a clone is taken the plant disappears.'), 'g'],
      [T('Сколько клонов даёт растение?', 'How many clones does a plant give?'), T('Базово 2, плюс по одному за каждые два гена Y (целое число). Например, GGGYYY даёт 3 клона.', 'Two as a base, plus one for every two Y genes (rounded down). For example GGGYYY gives 3 clones.'), 'g'],
      [T('Что даёт каждая буква?', 'What does every letter do?'), T('G ускоряет рост на 25% за ген. Y добавляет 25% урожая за ген и клонов. H добавляет стойкость к холоду и жаре. W тратит больше воды (+10% за ген). X ничего не даёт. Цена семян у торговцев растёт с каждым полезным геном.', 'G speeds growth by 25% per gene. Y adds 25% harvest per gene and clones. H adds resistance to cold and heat. W uses more water (+10% per gene). X does nothing. The vendor price of seeds grows with every useful gene.'), 'g'],
      [T('Какой набор лучший?', 'Which set is the best?'), T('Для большинства игроков GGGYYY: рост ×1.75 и урожай ×1.75. Для быстрых сборов GGGGYY, для максимума урожая YYYYGG, для холодных биомов HHHGGG. Эти четыре набора предлагает irust.ru.', 'For most players GGGYYY: growth ×1.75 and harvest ×1.75. For quick harvests GGGGYY, for maximum harvest YYYYGG, for cold biomes HHHGGG. These four sets are the ones irust.ru offers.'), 'c'],
      [T('Бывают ли «божественные» клоны из одних зелёных букв?', 'Are there "god" clones made of green letters only?'), (() => { const y = effectsOf('YYYYYY'), g = effectsOf('GGGGGG'); return T('Да, это предельные наборы. YYYYYY: урожай ×' + num1(y.yieldMul, 2) + ', ' + y.clones + ' клонов с растения, но рост обычный. GGGGGG: рост ×' + num1(g.speed, 2) + ', спелость через ' + fmtSec(g.ripe) + ', урожай обычный. Мета-набор GGGYYY держит середину между ними.', 'Yes, these are the extreme sets. YYYYYY: harvest ×' + num1(y.yieldMul, 2) + ', ' + y.clones + ' clones per plant, but normal growth. GGGGGG: growth ×' + num1(g.speed, 2) + ', ripe after ' + fmtSec(g.ripe) + ', normal harvest. The meta set GGGYYY keeps the middle between them.'); })(), 'g'],
      [T('Что делать с готовым клоном?', 'What to do with the finished clone?'), T('Лучше посадить его отдельно, в одиночную грядку, чтобы соседи его уже не меняли, и размножать клонами.', 'Plant it alone, for example in a single planter, so that neighbours do not change it, and multiply it with clones.'), 'c'],
    ]) + '<p class="mut">' + T('✓ означает, что ответ проверен по настоящему коду игры нашего сервера. Модель скрещивания сверена с игрой на 12 000 случайных проверках (три вида грядок, случайные гены, случайный порядок посадки): расхождений 0. 🔎 означает совпадение с сообществом, проверить по коду нельзя.', '✓ means the answer was checked against the real game code of our server. The crossbreeding model was compared with the game on 12,000 random checks (three planter types, random genes, random planting order): 0 differences. 🔎 means it agrees with the community and cannot be checked in the code.') + '</p></div>'
      + '<div class="ghow"><h4>' + T('Источники', 'Sources') + '</h4><ul class="gl2"><li>' + T('Код игры на нашем сервере: GrowableGenetics.CrossBreed, GrowableEntity, PlantProperties, точки посадки грядок.', 'Game code on our server: GrowableGenetics.CrossBreed, GrowableEntity, PlantProperties, the planting points of the planters.') + '</li><li><a href="https://irust.ru/genetic" target="_blank" rel="noopener">irust.ru/genetic</a> ' + T('(калькулятор генов: наборы GGGYYY, GGGGYY, YYYYGG, HHHGGG)', '(gene calculator: the sets GGGYYY, GGGGYY, YYYYGG, HHHGGG)') + '</li><li><a href="https://rustgenes.gg/guides/rust-crossbreeding-layout" target="_blank" rel="noopener">rustgenes.gg</a> ' + T('(схема 3 × 3, центр достаёт до 8 соседей, край 5, угол 3)', '(the 3 × 3 layout, the middle reaches 8 neighbours, a side 5, a corner 3)') + '</li></ul></div>';
  }
  function guideHtml() {
    const st = stagesOf(), names = [T('Семя', 'Seed'), T('Рассада', 'Seedling'), T('Саженец', 'Sapling'), T('Скрещивание', 'Crossbreeding'), T('Взросление', 'Mature'), T('Плодоношение', 'Fruiting')];
    let acc = 0, acc4 = 0;
    const rows = st.slice(0, 6).map((s, i) => { acc += s.seconds || 0; acc4 += i === 3 ? (s.seconds || 0) : (s.seconds || 0) / 2; return '<div class="trow"><div class="tn"><b>' + (i + 1) + '. ' + names[i] + '</b></div><div class="tx">' + fmtSec(s.seconds) + '</div><div class="tx"><b>' + fmtSec(acc) + '</b> / <span class="mut">' + fmtSec(acc4) + ' (GGGG)</span></div></div>'; }).join('');
    const w = WEIGHT();
    return '<div class="ghow" style="margin-top:6px"><h4>' + T('Гены простыми словами', 'Genes in plain words') + '</h4><p class="mut">' + T('У каждого растения 6 ячеек генов. В каждой стоит одна буква. Зелёные буквы полезные, красные вредные. Цель выращивания: заменить плохие буквы на хорошие. Идеал для большинства: GGGYYY.', 'Every plant has 6 gene slots with one letter in each. Green letters are useful, red ones are harmful. The goal is to replace bad letters with good ones. The ideal for most is GGGYYY.') + '</p><div class="gkey">' + Object.entries(GENES).map(([k, v]) => '<div><b class="gl g' + k + '">' + k + '</b> <b>' + T(v[0], v[1]) + '</b><small>' + T(v[2], v[3]) + '</small></div>').join('') + '</div></div>'
      + '<div class="ghow"><h4>' + T('Как гены переходят от соседей', 'How genes pass from neighbours') + '</h4><ul class="gl2"><li>' + T('Работает только в одной грядке и только между растениями одной культуры. Расстояние до соседа меньше 1.5 м.', 'Works only inside one planter and only between plants of the same crop. The neighbour must be closer than 1.5 m.') + '</li><li>' + T('Каждая ячейка считается отдельно. Побеждает ген с большей суммой веса.', 'Every slot is counted on its own. The gene with the bigger sum of weights wins.') + '</li><li>' + T('Вес зелёного G, Y, H = ' + w.G + ', вес красного W, X = ' + w.W + '. Один зелёный сосед проиграет одному красному. Два зелёных победят одного красного.', 'The weight of green G, Y, H = ' + w.G + ', of red W, X = ' + w.W + '. One green neighbour loses to one red one. Two greens beat one red.') + '</li><li>' + T('Растение меняет свой ген, только если победитель тяжелее его собственного. Свой красный ген (' + w.W + ') заменят два зелёных соседа.', 'The plant replaces its gene only if the winner outweighs its own. Its own red gene (' + w.W + ') is replaced by two green neighbours.') + '</li><li>' + T('Меняется только растение, которое дошло до стадии «Скрещивание», и только один раз. Потом его клон несёт новые гены.', 'Only the plant that reached the crossbreeding stage changes, and only once. After that its clone carries the new genes.') + '</li><li>' + T('Клон нельзя взять во время стадии «Скрещивание». Подожди следующую стадию. Когда берёшь клон, растение исчезает.', 'A clone cannot be taken during the crossbreeding stage. Wait for the next stage. When you take a clone the plant disappears.') + '</li></ul></div>'
      + '<div class="ghow"><h4>' + T('Сколько ждать', 'How long to wait') + ' · ' + cropName(G.crop) + '</h4><div class="ttab"><div class="trow"><div class="tn"><b>' + T('Стадия', 'Stage') + '</b></div><div class="tx">' + T('длится', 'lasts') + '</div><div class="tx">' + T('с посадки / с генами GGGG', 'since planting / with GGGG') + '</div></div>' + rows + '</div><p class="mut">' + T('Клон можно взять на стадии «Саженец» (гены ещё старые) и со стадии «Взросление» (гены уже новые). Во время «Скрещивание» нельзя. Ген G ускоряет все стадии, кроме «Скрещивание».', 'A clone can be taken at the sapling stage (genes still old) and from the mature stage (genes new). Not during crossbreeding. Every G speeds all stages except crossbreeding.') + '</p></div>'
      + faqPlants()
      + '<div class="ghow"><h4>' + T('Частые ошибки', 'Common mistakes') + '</h4><ul class="gl2"><li>' + T('Посадил растения в разные грядки: гены не передаются.', 'Plants in different planters: genes do not pass.') + '</li><li>' + T('Посадил разные культуры рядом: красные ягоды не скрещиваются с синими.', 'Different crops side by side: red berries do not cross with blue ones.') + '</li><li>' + T('Растения дальше 1.5 м друг от друга.', 'Plants farther than 1.5 m from each other.') + '</li><li>' + T('Пытаешься взять клон слишком рано, пока идёт стадия «Скрещивание».', 'Trying to take a clone too early, during the crossbreeding stage.') + '</li><li>' + T('Один сосед не победит: нужно два зелёных против одного красного гена.', 'One neighbour is not enough: two greens are needed against one red gene.') + '</li></ul></div>';
  }

  function plantsHtml() {
    const modes = [['plan', 'Схема посадки', 'Planting plan'], ['cond', 'Условия и туториалы', 'Conditions and tutorials'], ['cross', 'Что получится', 'What you get'], ['guide', 'Как это работает', 'How it works']];
    return '<div class="fch">' + modes.map((m) => '<button class="fc' + (G.pmode === m[0] ? ' on' : '') + '" data-gnpm="' + m[0] + '">' + T(m[1], m[2]) + '</button>').join('') + '</div>' + (G.pmode === 'plan' ? planForm() : G.pmode === 'cross' ? crossForm() : G.pmode === 'cond' ? condHtml() : cropPicker() + guideHtml());
  }
  const cropPicker = () => '<div class="gcrops">' + CROPS.map((c) => '<button class="gcrop' + (G.crop === c[0] ? ' on' : '') + '" data-gncrop="' + c[0] + '">' + cropIcon(c[0]) + '<span>' + T(c[1], c[2]) + '<small>' + (FRUIT_IC[c[0]] ? '' : '') + '</small></span></button>').join('') + '</div>';
  const scanBtn = () => '<button class="btn gscanbtn" data-gnscan>📷 ' + T('Сканер экрана', 'Screen scanner') + '</button>';

  function crossForm() {
    return '<p class="mut">' + T('Впиши гены растения в центре и его соседей (до 8, по 6 букв). Соседи должны стоять в той же грядке ближе 1.5 м. Центр можно оставить пустым.', 'Type the genes of the plant in the middle and its neighbours (up to 8, six letters each). They must be in the same planter closer than 1.5 m. The middle can stay empty.') + '</p>' + cropPicker() + '<div class="tq" style="margin-bottom:10px">' + scanBtn() + '</div><div class="gx"><div class="ggrid ginput">' + [0, 1, 2, 3, null, 4, 5, 6, 7].map((p) => (p === null ? '<div class="gcell gc"><small>' + T('растение в центре', 'middle plant') + '</small><input class="gi" maxlength="6" placeholder="XXXXXX" data-gnown value="' + esc(G.own) + '"></div>' : '<input class="gi" maxlength="6" placeholder="GYGHYG" data-gnn="' + p + '" value="' + esc(G.neigh[p]) + '">')).join('') + '</div><div id="gxInfo"></div></div>' + stageHtml() + howHtml();
  }
  function crossRes() {
    const list = G.neigh.map(clean).filter(valid), own = valid(clean(G.own)) ? clean(G.own) : null;
    const info = document.getElementById('gxInfo');
    if (!info) return;
    if (list.length < 1) { info.innerHTML = '<div class="tnote">' + T('Впиши гены хотя бы одного соседа.', 'Type the genes of at least one neighbour.') + '</div>'; return; }
    const r = cross(list, own), good = [...r.code].filter((c) => 'GYH'.includes(c)).length;
    info.innerHTML = '<div class="tnote"><b>' + T('Итог для центрального растения', 'Result for the middle plant') + '</b><div style="margin:6px 0">' + letters(r.code) + '</div>' + T('Полезных генов', 'Good genes') + ': <b>' + good + '/6</b>' + (r.slots.some((x) => !x.kept && x.win.length > 1) ? ' · ' + T('в ячейках с равными весами выигрывает сосед, посаженный раньше', 'in slots with equal weights the neighbour planted earlier wins') : '') + '</div>' + (valid(r.code) ? effectsHtml(r.code) : '') + '<div class="ttab">' + r.slots.map((s, i) => '<div class="trow gsl"><div class="tn"><b>' + T('Ячейка', 'Slot') + ' ' + (i + 1) + '</b></div><div class="tx">' + Object.entries(s.sum).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<b class="gl g' + k + '">' + k + '</b> ' + v.toFixed(1)).join('  ') + '</div><div class="tx"><b>' + (s.kept ? T('остался свой ', 'own kept ') + s.mine : s.win.join(' / ')) + '</b></div></div>').join('') + '</div>';
  }

  function planForm() {
    const inv = G.inv[G.crop] || [], counts = {};
    inv.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    return introHtml() + '<h4 class="tlist">' + T('1. Что выращиваем', '1. What we grow') + '</h4>' + cropPicker()
      + '<h4 class="tlist">' + T('2. Какая у тебя грядка', '2. Your planter') + '</h4><div class="glays">' + Object.keys(LAYOUTS).map((k) => '<button class="glay' + (G.layout === k ? ' on' : '') + '" data-gnlay="' + k + '">' + itemImg(LAYOUTS[k].item, 'gim', '🪴') + miniHtml(k) + '<b>' + T(LAYOUTS[k].n[0], LAYOUTS[k].n[1]) + '</b><small>' + T(LAYOUTS[k].d[0], LAYOUTS[k].d[1]) + '</small></button>').join('') + '</div>'
      + '<h4 class="tlist">' + T('3. Твои клоны (буквы генов)', '3. Your clones (gene letters)') + '</h4><div class="tq"><input class="gi" id="gnAdd" maxlength="6" placeholder="GGYYXX" autocomplete="off"><button class="btn pri" data-gnadd>' + T('Добавить', 'Add') + '</button>' + scanBtn() + '<button class="btn" data-gnexample>' + T('Пример', 'Example') + '</button><button class="btn" data-gnclear>' + T('Очистить', 'Clear') + '</button></div><div class="gchips">'
      + (Object.keys(counts).length ? Object.entries(counts).map(([c, n]) => '<span class="gchip">' + cropIcon(G.crop) + letters(c) + '<i>×' + n + '</i><button data-gnrm="' + c + '" aria-label="' + T('убрать', 'remove') + '">−</button></span>').join('') : '<span class="mut">' + T('Пока пусто: впиши 6 букв и нажми Enter или включи сканер.', 'Empty so far: type six letters and press Enter or turn on the scanner.') + '</span>') + '</div>'
      + '<h4 class="tlist">' + T('4. Какие гены хочешь', '4. The genes you want') + '</h4><div class="gpre">' + PRESETS.map((p) => '<button class="gp' + (G.target === p[0] && !G.custom ? ' on' : '') + '" data-gntarget="' + p[0] + '"><span>' + letters(p[0]) + '</span><b>' + T(p[1], p[2]) + '</b><small>' + T(p[3], p[4]) + '</small></button>').join('') + '</div><div class="tq" style="margin-top:10px"><label class="mut">' + T('или свой', 'or your own') + '</label><input class="gi" id="gnCustom" maxlength="6" placeholder="GGGYYY" value="' + esc(G.custom) + '"></div>'
      + '<h4 class="tlist">' + T('5. Что и куда сажать', '5. What to plant and where') + '</h4><div id="gnPlan"></div>' + stageHtml() + howHtml();
  }
  const clock = (s) => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  // everything about one round: the picture, the order with the times, the wait and the clone you get
  function roundBody(r, target, key) {
    const L = LAYOUTS[key], order = plantRank(r.start).filter((k) => r.codes[k]);
    const lines = order.map((k, n) => '<li><b class="gno">' + (n + 1) + '</b>' + cropIcon(G.crop) + '<span><b>' + (r.start[k] < 1 ? T('Сразу', 'Right away') : T('Через ', 'After ') + clock(r.start[k])) + '</b> · ' + T('точка ', 'spot ') + (k + 1) + ' · ' + where(L, k) + (k === 0 ? ' · ' + T('цель', 'target') : '') + '</span><span class="gls">' + letters(r.codes[k], k === 0 ? target : null) + '</span></li>').join('')
      + r.codes.map((c, k) => (c ? '' : '<li class="emp"><b class="gno">–</b><span class="mut">' + T('точка ', 'spot ') + (k + 1) + ' · ' + where(L, k) + ' — ' + T('оставь пустой', 'leave it empty') + '</span></li>')).join('');
    return boxHtml(key, r.codes, target)
      + '<p class="gcap">' + T('Пунктир: радиус 1.5 м вокруг точки 1. Меняются гены растения в точке 1.', 'Dashed: the 1.5 m radius around spot 1. The genes of the plant in spot 1 change.') + '</p>'
      + '<h5>' + T('1. Сажай в таком порядке', '1. Plant in this order') + '</h5><p class="mut">' + T('Время считается от посадки первого клона. Позже сажаем клоны с быстрым ростом, чтобы они не успели скреститься раньше цели.', 'The time counts from planting the first clone. Fast growing clones are planted later so that they cannot cross before the target.') + '</p><ol class="gorder">' + lines + '</ol>'
      + '<h5>' + T('2. Жди', '2. Wait') + '</h5><p>⏱ ' + T('Растение в точке 1 скрестится через ', 'The plant in spot 1 crosses after ') + '<b>' + fmtSec(r.tCross) + '</b>. ' + T('Клон с него можно брать через ', 'A clone can be taken after ') + '<b>' + fmtSec(r.tClone) + '</b> ' + T('после его посадки.', 'from planting it.') + ' <span class="mut">' + T('Время дано для 100% условий: проверь вкладку «Условия».', 'The time is for 100% conditions: see the tab "Conditions".') + '</span></p>'
      + '<h5>' + T('3. Забери клон с точки 1', '3. Take a clone from spot 1') + '</h5><p>' + cropIcon(G.crop) + ' ×' + cloneCount(r.final) + ' ' + letters(r.final, target) + ' <small class="mut">(' + r.matches + '/6)</small></p>'
      + '<p class="mut">' + T('Прогноз верен, если у всех растений одинаковые свет, вода и почва (качество не ниже ' + Math.round(r.qmin * 100) + '%).', 'The forecast holds if all plants have the same light, water and ground (quality not below ' + Math.round(r.qmin * 100) + '%).') + (r.tie ? ' ' + T('Есть ячейка с равными весами: итог зависит от порядка посадки, сажай строго по списку.', 'A slot has equal weights: the result depends on the planting order, plant exactly as listed.') : '') + '</p>'
      + '<details><summary>' + T('Что станет с остальными растениями (ориентировочно)', 'What happens to the other plants (approximate)') + '</summary><p class="mut">' + T('Они скрещиваются позже и видят уже новые гены цели. Если несколько растений скрещиваются одновременно, порядок между ними игра выбирает сама.', 'They cross later and see the new genes of the target. If several cross at the same time the game picks the order itself.') + '</p>' + r.genes.map((c, k) => (c && k ? '<div class="gfin"><b class="gno">' + (k + 1) + '</b>' + letters(c, target) + '<small class="mut">×' + cloneCount(c) + '</small></div>' : '')).join('') + '</details>';
  }
  // other results the clones can give in one round, best first
  function altsHtml(all, key, target, skip) {
    const list = (all || []).filter((c) => c.res.code !== skip).slice(0, 40);
    if (!list.length) return '';
    return '<h4 class="tlist">' + T('Другие результаты из твоих клонов', 'Other results from your clones') + ' <small class="mut">(' + list.length + ')</small></h4><p class="mut">' + T('Не всегда нужен именно лучший. Нажми на результат, чтобы увидеть, что и куда посадить.', 'You do not always need the very best. Click a result to see what to plant and where.') + '</p><div class="galts">'
      + list.map((c) => { const r = mkRound(key, c, target), e = effectsOf(r.final); return '<details class="galt"><summary><span class="gls">' + letters(r.final, target) + '</span><b>' + r.matches + '/6</b><small>' + T('рост ×', 'growth ×') + num1(e.speed, 2) + ' · ' + T('урожай ×', 'harvest ×') + num1(e.yieldMul, 2) + ' · ' + e.clones + ' ' + T('клона', 'clones') + ' · ' + fmtSec(r.tClone) + '</small></summary><div class="galtb">' + roundBody(r, target, key) + '</div></details>'; }).join('') + '</div>';
  }
  function planRes() {
    const box = document.getElementById('gnPlan');
    if (!box) return;
    const target = G.custom && valid(G.custom.toUpperCase()) ? G.custom.toUpperCase() : G.target, inv = G.inv[G.crop] || [], key = G.layout, L = LAYOUTS[key];
    if (inv.length < 2) { box.innerHTML = '<div class="tnote">' + T('Добавь хотя бы два клона, и схема появится здесь.', 'Add at least two clones and the plan appears here.') + '</div>'; return; }
    const counts = {};
    inv.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    const rounds = buildPlan(key, counts, target);
    if (!rounds.length) { box.innerHTML = '<div class="tnote bad">' + T('Не получилось собрать схему.', 'Could not build a plan.') + '</div>'; return; }
    const last = rounds[rounds.length - 1], done = last.matches === 6, total = rounds.reduce((s, r) => s + r.tClone, 0);
    box.innerHTML = '<div class="tnote' + (done ? '' : ' bad') + '">' + (done ? '✅ ' + T('Цель достигнута за ' + rounds.length + ' круг(а). Всего ждать примерно ' + fmtSec(total) + '.', 'The goal is reached in ' + rounds.length + ' round(s). About ' + fmtSec(total) + ' of waiting.') : T('Лучшее, что выходит из твоих клонов: совпало ' + last.matches + ' из 6 букв цели. Другие варианты ниже, а чтобы дойти до цели, добавь клонов с нужными генами.', 'The best your clones give: ' + last.matches + ' of the 6 letters match. Other options are below; to reach the goal add clones with the genes you need.')) + '</div>'
      + '<div class="gsteps">' + rounds.map((r, i) => '<div class="card gstep"><h4>' + T('Круг', 'Round') + ' ' + (i + 1) + ' <small class="mut">' + itemImg(L.item, 'gim s', '🪴') + ' ' + T(L.n[0], L.n[1]) + '</small></h4>' + roundBody(r, target, key) + (i < rounds.length - 1 ? '<p class="mut">' + T('Для следующего круга возьми клоны с точки 1 этого круга.', 'For the next round take the clones from spot 1 of this round.') + '</p>' : '') + '</div>').join('') + '</div>'
      + (valid(last.final) ? effectsHtml(last.final, T('Итоговый клон', 'The final clone')) : '')
      + altsHtml(rounds[0].all, key, target, rounds[0].final);
  }

  /* ---------- conditions of growth: the numbers are the code of the game of our server (GrowableEntity.Calculate*Quality, PlanterBox, Sprinkler, the curves of the plant) ---------- */
  const HAPPY = [-1, -0.977, -0.913, -0.817, -0.699, -0.568, -0.432, -0.301, -0.183, -0.087, -0.023, 0, 0.003, 0.014, 0.03, 0.052, 0.079, 0.111, 0.147, 0.186, 0.229, 0.275, 0.322, 0.372, 0.423, 0.474, 0.526, 0.577, 0.628, 0.678, 0.725, 0.771, 0.814, 0.853, 0.889, 0.921, 0.948, 0.97, 0.986, 0.997, 1, 0.993, 0.972, 0.939, 0.896, 0.844, 0.784, 0.718, 0.648, 0.575, 0.5, 0.425, 0.352, 0.282, 0.216, 0.156, 0.104, 0.061, 0.028, 0.007, 0]; // temperature -10..50 step 1
  const TODC = [0, 0.005, 0.02, 0.043, 0.074, 0.112, 0.156, 0.206, 0.259, 0.316, 0.376, 0.438, 0.5, 0.562, 0.624, 0.684, 0.741, 0.794, 0.844, 0.888, 0.926, 0.957, 0.98, 0.995, 1, 0.995, 0.98, 0.957, 0.926, 0.888, 0.844, 0.794, 0.741, 0.684, 0.624, 0.562, 0.5, 0.438, 0.376, 0.316, 0.259, 0.206, 0.156, 0.112, 0.074, 0.043, 0.02, 0.005, 0]; // hour 0..24 step 0.5
  const SUNRISE = 7.28, SUNSET = 19.73, HEAT = 10, HEAT_R = 3, LAMP_R = 3, SPR_R = 3, CAP = { large: 9000, small: 3000, tri: 3000, tub: 3000, cart: 3000 };
  const lin = (arr, x, x0, step) => { const p = (x - x0) / step, i = Math.min(arr.length - 2, Math.max(0, Math.floor(p))), f = Math.min(1, Math.max(0, p - i)); return arr[i] * (1 - f) + arr[i + 1] * f; };
  const happyAt = (t) => lin(HAPPY, Math.min(50, Math.max(-10, t)), -10, 1);
  const todAt = (h) => lin(TODC, Math.min(24, Math.max(0, h)), 0, 0.5);
  const cl01 = (v) => Math.min(1, Math.max(0, v));
  const isNightAt = (h) => h < SUNRISE || h > SUNSET;
  const optOf = () => { const p = plant().props || {}; return { l: p.OptimalLightQuality ?? 0.8, w: p.OptimalWaterQuality ?? 0.8, g: p.OptimalGroundQuality ?? 0.8, t: p.OptimalTemperatureQuality ?? 0.8, intake: p.WaterIntake ?? 4 }; };
  function lightQ(roof, lamp, hour, opt) {
    let l = roof || isNightAt(hour) ? 0 : todAt(hour);
    if (l <= 0) l = lamp ? 1 : 0;
    return cl01(l / opt.l);
  }
  const waterQ = (f, opt) => cl01((f > 0.6 ? 1 - (f - 0.6) / 0.4 * 0.4 : f / 0.6) / opt.w);
  const groundQ = (fert, opt) => cl01((0.6 + (fert ? 0.4 : 0)) / opt.g);
  const tempOf = (climate, heater) => Math.max(climate, 15) + (heater ? HEAT : 0);
  const tempQ = (t, h, opt) => cl01(cl01(happyAt(t) + 0.05 * h) / opt.t);
  function condCalc(c) {
    const opt = optOf(), f = c.water / 100;
    const q = { light: lightQ(c.roof, c.lamp, c.hour, opt), water: waterQ(f, opt), ground: groundQ(c.fert, opt), temp: tempQ(tempOf(c.temp, c.heater), c.h, opt) };
    const overall = Math.min(q.light, q.water, q.ground, q.temp), speed = overall * (1 + 0.25 * c.g);
    const st = stagesOf(), fixed = (st[3] || {}).seconds || 0, grow = (n) => st.slice(0, n).reduce((s, x, i) => s + (i === 3 ? 0 : x.seconds || 0), 0);
    const when = (n) => (speed > 0 ? grow(n) / speed + (n > 3 ? fixed : 0) : Infinity);
    return { q, overall, speed, opt, tCross: when(3), tClone: when(3) + fixed, tRipe: when(6), low: Object.entries(q).sort((a, b) => a[1] - b[1])[0][0] };
  }
  const pc = (v) => Math.round(v * 100) + '%';
  const hm = (h) => Math.floor(h) + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0');
  // temperature range and daylight hours in which a quality reaches 100%
  function tRange(o) { let a = null, b = null; for (let x = -10; x <= 50; x += 0.1) { if (tempQ(x, 0, o) >= 0.999) { if (a === null) a = x; b = x; } } return a === null ? [0, 0] : [Math.ceil(a), Math.floor(b)]; }
  function lRange(o) { let a = null, b = null; for (let h = SUNRISE; h <= SUNSET; h += 0.01) { if (lightQ(false, false, h, o) >= 0.999) { if (a === null) a = h; b = h; } } return a === null ? [12, 12] : [a, b]; }
  const QN = { light: ['Свет', 'Light', 'sun'], water: ['Вода', 'Water', 'water'], ground: ['Почва', 'Ground', 'fert'], temp: ['Тепло', 'Warmth', 'temp'] };
  const QADV = {
    light: ['Нужен свет: под открытым небом он есть только днём. Поставь над грядкой крышу и включённый Ceiling Light в радиусе 3 м от центра грядки.', 'Light is needed: under open sky it exists only in the daytime. Put a roof over the planter and a powered Ceiling Light within 3 m of the planter centre.'],
    water: ['Вода вне зоны 100%. Держи заполнение грядки в зелёной зоне, не доливай до самого верха.', 'The water is outside the 100% zone. Keep the planter inside the green zone and do not fill it to the top.'],
    ground: ['Положи в грядку удобрение (Fertilizer): по одному на каждое растение. Без него почва даёт только 75%.', 'Put Fertilizer into the planter: one for every plant. Without it the ground gives only 75%.'],
    temp: ['Холодно. Поставь Electric Heater в радиусе 3 м от грядки: он даёт +10 °C. Для полной скорости нужно %T% °C.', 'It is cold. Put an Electric Heater within 3 m of the planter: it gives +10 °C. Full speed needs %T% °C.'],
  };
  const C = { hour: 12, roof: false, lamp: false, water: 60, fert: false, temp: 17, heater: false, g: 0, h: 0, planter: 'large', plants: 9, spr: 0 };
  function condForm() {
    const slider = (k, min, max, step, lab, unit) => '<label class="gcl"><span>' + lab + ': <b id="gc_' + k + '">' + (k === 'hour' ? hm(C[k]) : C[k] + unit) + '</b></span><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + C[k] + '" data-gncond="' + k + '"></label>';
    const chk = (k, lab) => '<label class="gcl chk"><input type="checkbox" data-gncond="' + k + '"' + (C[k] ? ' checked' : '') + '> ' + lab + '</label>';
    return '<div class="gcond"><div class="gcc"><h4>' + T('Условия твоей грядки', 'Conditions of your planter') + '</h4>'
      + slider('hour', 0, 23.5, 0.5, T('Время в игре', 'Time in game'), '') + chk('roof', T('Над грядкой есть крыша или потолок', 'There is a roof or ceiling over the planter')) + chk('lamp', T('В радиусе 3 м включён Ceiling Light', 'A powered Ceiling Light is within 3 m'))
      + slider('water', 0, 100, 1, T('Вода в грядке', 'Water in the planter'), '%') + chk('fert', T('В грядке лежит удобрение (на каждое растение)', 'Fertilizer lies in the planter (one per plant)'))
      + slider('temp', -10, 40, 1, T('Температура воздуха биома', 'Air temperature of the biome'), '°C') + chk('heater', T('Рядом (до 3 м) включён Electric Heater', 'A powered Electric Heater is near (within 3 m)'))
      + slider('g', 0, 6, 1, T('Генов G у растения', 'G genes of the plant'), '') + slider('h', 0, 6, 1, T('Генов H у растения', 'H genes of the plant'), '') + '</div><div class="gcr" id="gnCondRes"></div></div>';
  }
  function condRes() {
    const box = document.getElementById('gnCondRes');
    if (!box) return;
    const r = condCalc(C), L = r.low;
    box.innerHTML = '<h4>' + cropName(G.crop) + '</h4><div class="gqs">' + Object.keys(QN).map((k) => '<div class="gq' + (k === L && r.overall < 0.999 ? ' low' : '') + '"><span>' + T(QN[k][0], QN[k][1]) + '</span><div class="gqb"><i style="width:' + Math.round(r.q[k] * 100) + '%"></i></div><b>' + pc(r.q[k]) + '</b></div>').join('') + '</div>'
      + '<div class="tgrid4"><div class="tc best"><b>' + pc(r.overall) + '</b><small>' + T('итоговое качество (самое слабое из четырёх)', 'overall quality (the weakest of four)') + '</small></div><div class="tc"><b>×' + num1(r.speed, 2) + '</b><small>' + T('скорость роста', 'growth speed') + '</small></div><div class="tc"><b>' + fmtSec(r.tCross) + '</b><small>' + T('до скрещивания', 'until crossbreeding') + '</small></div><div class="tc"><b>' + fmtSec(r.tClone) + '</b><small>' + T('до клона с нового растения', 'until a clone of the new plant') + '</small></div><div class="tc"><b>' + fmtSec(r.tRipe) + '</b><small>' + T('до спелости', 'until ripe') + '</small></div></div>'
      + (r.overall >= 0.999 ? '<div class="tnote">✅ ' + T('Все четыре условия на 100%. Растение растёт с максимальной скоростью.', 'All four conditions are at 100%. The plant grows at full speed.') + '</div>' : r.overall <= 0 ? '<div class="tnote bad">⛔ ' + T('Растение не растёт совсем: ' + QADV[L][0], 'The plant does not grow at all: ' + QADV[L][1]).replace('%T%', tRange(r.opt).join('–')) + '</div>' : '<div class="tnote bad">⚠ ' + T('Тормозит условие «' + QN[L][0] + '»: ', 'The condition "' + QN[L][1] + '" holds it back: ') + T(QADV[L][0], QADV[L][1]).replace('%T%', tRange(r.opt).join('–')) + '</div>')
      + waterHtml();
  }
  function waterHtml() {
    const o = optOf(), cap = CAP[C.planter] || 3000, lo = 0.6 * o.w, hi = 1.6 - o.w, perMin = C.plants * o.intake, cur = C.water / 100 * cap;
    const toLow = Math.max(0, (cur - lo * cap) / Math.max(1, perMin)), toDry = cur / Math.max(1, perMin), refill = C.spr > 0 ? Math.max(0, (hi * cap - cur) / (C.spr * 180)) : null;
    return '<h4 class="tlist">' + T('Сколько воды нужно', 'How much water is needed') + '</h4><div class="tq"><select data-gncond="planter" class="gi">' + Object.keys(LAYOUTS).map((k) => '<option value="' + k + '"' + (C.planter === k ? ' selected' : '') + '>' + T(LAYOUTS[k].n[0], LAYOUTS[k].n[1]) + '</option>').join('') + '</select><label class="mut">' + T('растений', 'plants') + ' <input class="gi" type="number" min="1" max="9" value="' + C.plants + '" data-gncond="plants" style="width:70px"></label><label class="mut">' + T('спринклеров', 'sprinklers') + ' <input class="gi" type="number" min="0" max="6" value="' + C.spr + '" data-gncond="spr" style="width:70px"></label></div>'
      + '<div class="gwbar"><i class="z" style="left:' + lo * 100 + '%;width:' + (hi - lo) * 100 + '%"></i><i class="p" style="left:' + C.water + '%"></i></div><div class="gwl"><span>0%</span><span>' + Math.round(lo * 100) + '%</span><span>' + Math.round(hi * 100) + '%</span><span>100%</span></div>'
      + '<ul class="gl2"><li>' + T('Ёмкость грядки ' + cap + ' единиц воды. Качество воды 100% при заполнении от ' + Math.round(lo * 100) + '% до ' + Math.round(hi * 100) + '% (' + Math.round(lo * cap) + ' – ' + Math.round(hi * cap) + ' единиц).', 'The planter holds ' + cap + ' units of water. Water quality is 100% when it is filled from ' + Math.round(lo * 100) + '% to ' + Math.round(hi * 100) + '% (' + Math.round(lo * cap) + ' – ' + Math.round(hi * cap) + ' units).') + '</li><li>' + T('Каждое растение тратит ' + o.intake + ' ед. воды в минуту, ' + C.plants + ' растений тратят ' + perMin + ' в минуту.', 'Every plant uses ' + o.intake + ' units of water per minute, ' + C.plants + ' plants use ' + perMin + ' per minute.') + '</li><li>' + T('От текущего уровня до нижней границы хватит на ' + fmtSec(toLow * 60) + ', до полной пустоты на ' + fmtSec(toDry * 60) + '.', 'From the current level to the lower border it lasts ' + fmtSec(toLow * 60) + ', until completely dry ' + fmtSec(toDry * 60) + '.') + '</li>' + (refill !== null ? '<li>' + T('Один спринклер даёт 15 ед. каждые 5 секунд (180 в минуту). ' + C.spr + ' шт. поднимут уровень до верхней границы за ' + fmtSec(refill * 60) + '.', 'One sprinkler gives 15 units every 5 seconds (180 per minute). ' + C.spr + ' of them raise the level to the upper border in ' + fmtSec(refill * 60) + '.') + '</li>' : '') + '<li>' + T('Заполнение выше верхней границы вредит: при 100% качество воды падает до ' + pc(waterQ(1, o)) + '.', 'Filling above the upper border hurts: at 100% the water quality falls to ' + pc(waterQ(1, o)) + '.') + '</li></ul>';
  }

  // top view of a greenhouse: the real radii of the game (metres)
  function setupSvg() {
    const S = 100, W = 880, H = 640, cx = W / 2, cy = H / 2, m = (v) => v * S;
    const img = (n, x, y, s) => '<image href="' + itemIc(n) + '" x="' + (x - s / 2) + '" y="' + (y - s / 2) + '" width="' + s + '" height="' + s + '"/>';
    const lamp = [0, 0], heater = [2.1, 0.2], spr = [-2.1, -0.2];
    const slots = LAYOUTS.large.pts.map((p) => '<circle cx="' + (cx + m(p[0])) + '" cy="' + (cy + m(p[1])) + '" r="13" fill="#6fae3a" stroke="#1b2410" stroke-width="2"/>').join('');
    return '<div class="gsvgw"><svg viewBox="0 0 ' + W + ' ' + H + '" class="gsvg" role="img" aria-label="' + T('Схема теплицы сверху', 'Top view of a greenhouse') + '">'
      + '<rect x="14" y="14" width="' + (W - 28) + '" height="' + (H - 28) + '" rx="22" fill="#12140d" stroke="#3a4030" stroke-width="2"/><rect x="' + (cx - m(LAYOUTS.large.W / 2)) + '" y="' + (cy - m(LAYOUTS.large.H / 2)) + '" width="' + m(LAYOUTS.large.W) + '" height="' + m(LAYOUTS.large.H) + '" rx="14" fill="#3b2c1c" stroke="#6b4f33" stroke-width="4"/>' + slots
      + '<circle cx="' + (cx + m(lamp[0])) + '" cy="' + (cy + m(lamp[1])) + '" r="' + m(LAMP_R) + '" fill="rgba(255,226,90,.08)" stroke="#ffd84a" stroke-dasharray="10 8" stroke-width="3"/>'
      + '<circle cx="' + (cx + m(heater[0])) + '" cy="' + (cy + m(heater[1])) + '" r="' + m(4) + '" fill="rgba(255,120,80,.06)" stroke="#ff8a5b" stroke-dasharray="3 7" stroke-width="2"/><circle cx="' + (cx + m(heater[0])) + '" cy="' + (cy + m(heater[1])) + '" r="' + m(HEAT_R) + '" fill="rgba(255,120,80,.10)" stroke="#ff8a5b" stroke-width="3"/>'
      + '<circle cx="' + (cx + m(spr[0])) + '" cy="' + (cy + m(spr[1])) + '" r="' + m(SPR_R) + '" fill="rgba(80,170,255,.08)" stroke="#59b4ff" stroke-width="3" stroke-dasharray="12 6"/>'
      + img('ceilinglight', cx + m(lamp[0]), cy + m(lamp[1]) - 34, 46) + img('electric.heater', cx + m(heater[0]), cy + m(heater[1]), 52) + img('electric.sprinkler', cx + m(spr[0]), cy + m(spr[1]), 52)
      + '<text x="' + cx + '" y="' + (cy + m(1.9)) + '" text-anchor="middle" fill="#ffd84a" font-size="19" font-weight="700">' + T('Ceiling Light: 3 м', 'Ceiling Light: 3 m') + '</text>'
      + '<text x="' + (cx + m(heater[0])) + '" y="' + (cy + m(heater[1]) + 52) + '" text-anchor="middle" fill="#ff8a5b" font-size="18" font-weight="700">' + T('Heater: +10 °C до 3 м, 0 на 4 м', 'Heater: +10 °C to 3 m, 0 at 4 m') + '</text>'
      + '<text x="' + (cx + m(spr[0])) + '" y="' + (cy + m(spr[1]) + 52) + '" text-anchor="middle" fill="#59b4ff" font-size="18" font-weight="700">' + T('Sprinkler: радиус 3 м', 'Sprinkler: radius 3 m') + '</text>'
      + '<text x="' + cx + '" y="' + (cy - m(1.55)) + '" text-anchor="middle" fill="#d4e85a" font-size="18" font-weight="700">' + T('Большая грядка 9 мест', 'Large planter, 9 spots') + '</text></svg></div>';
  }
  function hoursChart() {
    const opt = optOf(), bars = [];
    for (let h = 0; h < 24; h++) {
      const sun = lightQ(false, false, h + 0.5, opt), lamp = lightQ(false, true, h + 0.5, opt);
      bars.push('<div class="gh1"><div class="gcol"><i class="lamp" style="height:' + Math.round(lamp * 100) + '%"></i><i class="sun" style="height:' + Math.round(sun * 100) + '%"></i></div><small>' + h + '</small></div>');
    }
    return '<div class="ghours">' + bars.join('') + '</div><p class="mut">' + T('Жёлтые столбики: свет под открытым небом без лампы. Серые: то, что добавляет Ceiling Light ночью. Под крышей с лампой свет 100% круглые сутки. Рассвет около ' + hm(SUNRISE) + ', закат около ' + hm(SUNSET) + ' (время в игре).', 'Yellow bars: light under open sky without a lamp. Grey: what a Ceiling Light adds at night. Under a roof with a lamp the light is 100% around the clock. Sunrise about ' + hm(SUNRISE) + ', sunset about ' + hm(SUNSET) + ' (game time).') + '</p>';
  }
  const step = (ic, title, text) => '<li class="gst">' + itemImg(ic, 'gim', '🧰') + '<span><b>' + title + '</b><small>' + text + '</small></span></li>';
  function condHtml() {
    const o = optOf(), lo = Math.round(0.6 * o.w * 100), hi = Math.round((1.6 - o.w) * 100), tr = tRange(o), lr = lRange(o);
    const tips = [
      [T('Главное правило: четыре условия, растёт по самому слабому', 'The main rule: four conditions, it grows at the weakest one'), '<p>' + T('У каждого растения есть четыре качества: свет, вода, почва и тепло. Скорость роста определяет самое слабое из них (на нашем сервере включена настройка useMinimumPlantCondition). Если три условия 100%, а четвёртое 75%, растение растёт на 75%. Ночью без света качество света 0 и растение стоит на месте.', 'Every plant has four qualities: light, water, ground and warmth. The weakest of them sets the growth speed (our server has useMinimumPlantCondition on). If three conditions are 100% and the fourth is 75%, the plant grows at 75%. At night without light the light quality is 0 and the plant stands still.') + '</p><div class="gfour">' + [['sun', 'ceilinglight', T('Свет', 'Light'), T('солнце или Ceiling Light', 'sun or Ceiling Light')], ['water', 'bucket.water', T('Вода', 'Water'), lo + '–' + hi + '%'], ['fert', 'fertilizer', T('Почва', 'Ground'), T('удобрение', 'fertilizer')], ['temp', 'electric.heater', T('Тепло', 'Warmth'), T('от ' + tr[0] + ' °C', 'from ' + tr[0] + ' °C')]].map((x) => '<div class="gf1">' + itemImg(x[1], 'gim', '❔') + '<b>' + x[2] + '</b><small>' + x[3] + '</small></div>').join('') + '</div>'],
      [T('Свет: солнце или Ceiling Light', 'Light: sun or Ceiling Light'), '<ol class="gsteps2">' + step('planter.large', T('Под открытым небом', 'Under open sky'), T('Свет есть только днём: от рассвета до заката. Полные 100% только примерно с ' + hm(lr[0]) + ' до ' + hm(lr[1]) + ', утром и вечером меньше. Ночью 0.', 'Light exists only in the daytime, from sunrise to sunset. A full 100% only from about ' + hm(lr[0]) + ' to ' + hm(lr[1]) + ', less in the morning and evening. Night 0.')) + step('ceilinglight', T('Теплица с Ceiling Light', 'Greenhouse with a Ceiling Light'), T('Закрой грядку крышей: тогда солнце не считается, и игра смотрит на лампу. Лампа должна быть включена и находиться ближе 3 м от центра грядки (повесь прямо над центром). Питание лампы 2 Вт. Свет 100% круглые сутки.', 'Cover the planter with a roof: then the sun does not count and the game looks at the lamp. The lamp must be on and within 3 m of the planter centre (hang it right above the centre). The lamp needs 2 W. Light is 100% around the clock.')) + step('electric.simplelight', T('Другие лампы не подходят', 'Other lamps do not work'), T('Растения видят только Ceiling Light. Обычные лампы, прожекторы и фонари на рост не влияют.', 'Plants see only the Ceiling Light. Normal lamps, spotlights and lanterns do not affect growth.')) + step('ceilinglight', T('Ceiling Light под открытым небом', 'Ceiling Light under open sky'), T('Днём лампу игра не учитывает, пока есть хоть немного солнца. Лампа работает только когда солнечный свет равен нулю: ночью или под крышей.', 'The game ignores the lamp while there is at least a little sun. The lamp counts only when the sunlight is zero: at night or under a roof.')) + '</ol>' + hoursChart()],
      [T('Вода: сколько лить и чем', 'Water: how much and with what'), '<ol class="gsteps2">' + step('bucket.water', T('Вручную', 'By hand'), T('Лей воду из Water Bucket или Water Jug на грядку. Следи за полоской воды в окне грядки: нужен диапазон ' + lo + '–' + hi + '%.', 'Pour water from a Water Bucket or Water Jug onto the planter. Watch the water bar in the planter window: the range ' + lo + '–' + hi + '% is needed.')) + step('electric.sprinkler', T('Спринклер', 'Sprinkler'), T('Спринклеру нужна только вода, электричество не нужно. Он поливает область радиусом около 3 м под собой: 15 единиц каждые 5 секунд. Он продолжает, пока грядка не заполнится до 100%. А при 100% качество воды всего ' + pc(waterQ(1, o)) + '. Поэтому перекрывай воду, когда уровень дошёл до ' + hi + '%.', 'The sprinkler needs only water, no electricity. It waters an area of about 3 m radius below it: 15 units every 5 seconds. It keeps going until the planter is 100% full. And at 100% the water quality is only ' + pc(waterQ(1, o)) + '. So cut the water when the level reaches ' + hi + '%.')) + step('waterpump', T('Насос', 'Water pump'), T('Насос стоит на воде и качает воду в шланг. Ему нужно электричество 5 Вт. Он тянет до 12 единиц потока, спринклер берёт 2, значит на один насос до 6 спринклеров.', 'The pump stands on water and pushes water into the hose. It needs 5 W of power. It carries up to 12 units of flow and a sprinkler takes 2, so one pump feeds up to 6 sprinklers.')) + step('water.catcher.large', T('Водосборник', 'Water catcher'), T('Водосборник собирает дождь, ему нужно открытое небо. Малый даёт поток до 6, большой до 12.', 'A water catcher collects rain and needs open sky. The small one gives a flow up to 6, the large one up to 12.')) + step('hosetool', T('Как соединить', 'How to connect'), T('Hose Tool: нажми на выход воды насоса (Water Output) и на вход спринклера (Water In). У спринклера есть выход Passthrough: через него вода идёт к следующему спринклеру.', 'Hose Tool: click the water output of the pump (Water Output) and then the sprinkler input (Water In). The sprinkler has a Passthrough output: through it the water goes on to the next sprinkler.')) + '</ol>'],
      [T('Почва: удобрение', 'Ground: fertilizer'), '<ol class="gsteps2">' + step('composter', T('Где взять', 'Where to get it'), T('Fertilizer делается в Composter (компостере) из органики.', 'Fertilizer is made in a Composter from organic matter.')) + step('fertilizer', T('Куда класть', 'Where to put it'), T('Открой грядку и положи Fertilizer в её ячейки. Каждое растение, которое ещё не удобрено, забирает одну штуку и остаётся удобренным навсегда. Для 9 растений нужно 9 штук.', 'Open the planter and put Fertilizer into its slots. Every plant that is not fertilised yet takes one piece and stays fertilised for good. 9 plants need 9 pieces.')) + step('planter.large', T('Что даёт', 'What it gives'), T('Без удобрения почва даёт 75% качества. С удобрением 100%. Это самая частая причина медленного роста.', 'Without fertilizer the ground gives 75% quality. With it 100%. This is the most common reason for slow growth.')) + '</ol>'],
      [T('Тепло: обогреватель', 'Warmth: heater'), '<ol class="gsteps2">' + step('electric.heater', T('Что делает', 'What it does'), T('Electric Heater (3 Вт) добавляет +10 °C растениям в радиусе 3 м, дальше греет всё слабее и на 4 м уже 0. Несколько обогревателей не складываются: берётся самый сильный.', 'The Electric Heater (3 W) adds +10 °C to plants within 3 m, then weaker, and at 4 m it is 0. Several heaters do not add up: the strongest one counts.')) + step('planter.large', T('Какая температура нужна', 'Which temperature is needed'), T('Грядка считает температуру не ниже 15 °C. Для 100% нужно от ' + tr[0] + ' до ' + tr[1] + ' °C. При 15 °C качество всего ' + pc(tempQ(15, 0, o)) + ', при ' + tr[0] + ' °C уже 100%. В холодных и умеренных биомах поставь обогреватель.', 'The planter counts the temperature as not lower than 15 °C. For 100% you need ' + tr[0] + ' to ' + tr[1] + ' °C. At 15 °C the quality is only ' + pc(tempQ(15, 0, o)) + ', at ' + tr[0] + ' °C already 100%. In cold and temperate biomes put a heater.')) + step('seed.red.berry', T('Ген H', 'The H gene'), T('Каждый ген H добавляет 5% к качеству тепла.', 'Every H gene adds 5% to the warmth quality.')) + '</ol>'],
      [T('Электричество для теплицы', 'Power for a greenhouse'), '<ol class="gsteps2">' + step('ceilinglight', 'Ceiling Light', '2 ' + T('Вт', 'W')) + step('electric.heater', 'Electric Heater', '3 ' + T('Вт', 'W')) + step('waterpump', 'Water Pump', '5 ' + T('Вт', 'W')) + step('electric.solarpanel.large', T('Откуда брать', 'Where from'), T('Сложи ватты своих устройств и подключи источник мощнее суммы: солнечная панель с аккумулятором или генератор. Без питания лампа и обогреватель не работают.', 'Add up the watts of your devices and connect a source stronger than the sum: a solar panel with a battery or a generator. Without power the lamp and the heater do not work.')) + '</ol>'],
      [T('Когда лучше сажать', 'When to plant'), '<p>' + T('Под открытым небом растение растёт только при солнце, поэтому сажай утром, около ' + hm(lr[0]) + ': до ' + hm(lr[1]) + ' оно растёт на полной скорости. В теплице с лампой время не важно. Игра пересчитывает рост раз в минуту (60 секунд), поэтому времена в схеме с точностью до минуты.', 'Under open sky the plant grows only in the sun, so plant in the morning around ' + hm(lr[0]) + ': until ' + hm(lr[1]) + ' it grows at full speed. In a greenhouse with a lamp the time does not matter. The game updates growth once a minute (60 seconds), so the times in the plan are accurate to a minute.') + '</p>'],
      [T('Схема теплицы на 100% (вид сверху)', 'A 100% greenhouse (top view)'), setupSvg() + '<ol class="gsteps2">' + step('planter.large', '1', T('Поставь большую грядку и крышу над ней.', 'Place a large planter and a roof over it.')) + step('ceilinglight', '2', T('Повесь Ceiling Light над центром грядки и подключи питание.', 'Hang a Ceiling Light above the centre of the planter and connect power.')) + step('electric.heater', '3', T('Если биом холодный, поставь Electric Heater в 2 м от центра.', 'If the biome is cold, put an Electric Heater 2 m from the centre.')) + step('fertilizer', '4', T('Положи в грядку удобрение: по штуке на каждое растение.', 'Put fertilizer into the planter: one piece for each plant.')) + step('electric.sprinkler', '5', T('Подведи воду шлангом к Sprinkler или лей вручную до ' + hi + '%.', 'Lead water to a Sprinkler with a hose or pour by hand up to ' + hi + '%.')) + step('seed.red.berry', '6', T('Сажай по схеме из вкладки «Схема посадки».', 'Plant by the plan from the tab "Planting plan".')) + '</ol>'],
    ];
    return introHtml2() + cropPicker() + condForm() + '<div class="ghow"><h4>' + T('Мини-туториалы', 'Mini tutorials') + '</h4><p class="mut">' + T('Это не видео: каждая цифра и каждое правило проверены в коде игры нашего сервера (текущая версия на ' + new Date().toLocaleDateString('ru-RU') + '). Нажми на вопрос, чтобы открыть шаги.', 'These are not videos: every number and rule was checked in the game code of our server (the current version on ' + new Date().toLocaleDateString('en-GB') + '). Click a title to open the steps.') + '</p><div class="gfaq">' + tips.map((x, i) => '<details' + (i === 0 ? ' open' : '') + '><summary>' + x[0] + '</summary><div>' + x[1] + '</div></details>').join('') + '</div></div>';
  }
  const introHtml2 = () => '<p class="mut">' + T('Растение растёт тем быстрее, чем лучше условия. Подвигай ползунки и посмотри, что тормозит рост твоей грядки.', 'The better the conditions, the faster the plant grows. Move the sliders and see what slows your planter down.') + '</p>';

  /* ---------- screen scanner: reads the six gene letters of a plant from the screen of the game ---------- */
  const SC = { kind: 'plant', markers: true, regions: {}, open: false, stream: null, stop: null, region: null, busy: false, last: '', stable: 0, added: '', miss: 0, auto: true, dest: 'inv', ocr: null, msg: '', full: null, colors: {}, reading: null, drag: null };
  try { SC.regions.plant = JSON.parse(localStorage.getItem('lima.gene.scanrect') || 'null'); SC.regions.animal = JSON.parse(localStorage.getItem('lima.gene.scanrect.animal') || 'null'); SC.region = SC.regions.plant; SC.colors = JSON.parse(localStorage.getItem('lima.gene.scancolors') || '{}'); } catch (e) { SC.region = null; }
  const scEl = (id) => document.getElementById(id);
  function loadTess() {
    if (window.Tesseract) return Promise.resolve();
    if (!SC.tess) {
      SC.tess = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
        s.onload = res; s.onerror = () => rej(new Error('load'));
        document.head.appendChild(s);
      });
      SC.tess.catch(() => { SC.tess = null; });
    }
    return SC.tess;
  }
  function loadOcr() {
    if (!SC.ocr) { SC.ocr = loadTess().then(async () => { const w = await window.Tesseract.createWorker('eng'); await w.setParameters({ tessedit_char_whitelist: 'GYHWX', tessedit_pageseg_mode: '10' }); return w; }); SC.ocr.catch(() => { SC.ocr = null; }); }
    return SC.ocr;
  }
  function loadOcrDigits() {
    if (!SC.ocrD) { SC.ocrD = loadTess().then(async () => { const w = await window.Tesseract.createWorker('eng'); await w.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '7' }); return w; }); SC.ocrD.catch(() => { SC.ocrD = null; }); }
    return SC.ocrD;
  }
  const warm = () => (SC.kind === 'animal' ? loadOcrDigits() : loadOcr());
  const otsu = (gray) => {
    const h = new Array(256).fill(0);
    gray.forEach((v) => h[v]++);
    const tot = gray.length;
    let sum = 0, sB = 0, wB = 0, best = 0, th = 128;
    for (let i = 0; i < 256; i++) sum += i * h[i];
    for (let i = 0; i < 256; i++) { wB += h[i]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += i * h[i]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = i; } }
    return th;
  };
  // one gene tile: finds the letter (the minority colour), normalises it to black on white and returns the tile colour
  function prepCell(src, x, y, w, h, inset) {
    const S = 80, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(src, x + w * inset, y + h * inset, w * (1 - 2 * inset), h * (1 - 2 * inset), 0, 0, S, S);
    const px = cx.getImageData(0, 0, S, S).data, gray = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) gray[i] = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000;
    let th = otsu(gray), above = 0;
    gray.forEach((v) => { if (v > th) above++; });
    let letterBright = above < S * S / 2;
    const mask = new Uint8Array(S * S);
    if (!letterBright) { // dark frame around a coloured tile: take the bright class again and split it once more
      const up = gray.filter((v) => v > th);
      if (up.length > 40) { const t2 = otsu(up); let a2 = 0; up.forEach((v) => { if (v > t2) a2++; }); if (a2 < up.length * 0.45) { th = t2; letterBright = true; } }
    }
    let x0 = S, y0 = S, x1 = -1, y1 = -1, rs = 0, gs = 0, bs = 0, n = 0;
    for (let i = 0; i < S * S; i++) {
      const on = letterBright ? gray[i] > th : gray[i] <= th;
      if (on) { mask[i] = 1; const X = i % S, Y = (i / S) | 0; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; } else { rs += px[i * 4]; gs += px[i * 4 + 1]; bs += px[i * 4 + 2]; n++; }
    }
    const color = n ? [rs / n, gs / n, bs / n] : [0, 0, 0];
    if (x1 - x0 < 4 || y1 - y0 < 6) return { canvas: null, color };
    const gw = x1 - x0 + 1, gh = y1 - y0 + 1, g = document.createElement('canvas');
    g.width = gw; g.height = gh;
    const gx = g.getContext('2d'), id = gx.createImageData(gw, gh);
    for (let yy = 0; yy < gh; yy++) for (let xx = 0; xx < gw; xx++) { const v = mask[(y0 + yy) * S + x0 + xx] ? 0 : 255, o = (yy * gw + xx) * 4; id.data[o] = id.data[o + 1] = id.data[o + 2] = v; id.data[o + 3] = 255; }
    gx.putImageData(id, 0, 0);
    const out = document.createElement('canvas'), H = 72, sc = H / gh, W = Math.max(8, Math.round(gw * sc));
    out.width = W + 60; out.height = H + 60;
    const ox = out.getContext('2d');
    ox.fillStyle = '#fff'; ox.fillRect(0, 0, out.width, out.height);
    ox.imageSmoothingEnabled = true;
    ox.drawImage(g, 30, 30, W, H);
    return { canvas: out, color };
  }

  // Colour of a circle of the genetics panel: grey = ok, red = bad, green = good. The big colour is the shown copy, a small dot of another colour is the carried copy.
  function classOf(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
    if (v < 0.25) return -1;
    if (s < 0.22) return v > 0.88 ? -1 : 1;
    const d = mx - mn;
    let h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h >= 75 && h <= 175) return 2;
    if (h <= 28 || h >= 335) return 0;
    return -1;
  }
  function readDisc(src, x, y, w, h) {
    const S = 48, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(src, x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.8, 0, 0, S, S);
    const px = cx.getImageData(0, 0, S, S).data, n = [0, 0, 0];
    for (let i = 0; i < S * S; i++) { const k = classOf(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]); if (k >= 0) n[k]++; }
    const total = n[0] + n[1] + n[2];
    if (total < 40) return { ok: false, hi: 1, lo: 1 };
    const share = n.map((q) => q / total);
    let hi = -1;
    for (let k = 2; k >= 0; k--) if (share[k] >= 0.1) { hi = k; break; }
    if (hi < 0) hi = share.indexOf(Math.max(...share));
    let lo = hi;
    for (let k = 0; k < 3; k++) if (k !== hi && share[k] >= 0.025 && k < hi && (lo === hi || share[k] > share[lo])) lo = k;
    return { ok: true, hi, lo };
  }
  async function readAnimal(src, r) {
    const cells = SC.markers ? 7 : 5, cw = r.w / cells, g = [], notes = [];
    for (let i = 0; i < 5; i++) { const d = readDisc(src, r.x + i * cw, r.y, cw, r.h); if (!d.ok) notes.push(i); g.push([d.hi, d.lo]); }
    let m = null;
    if (SC.markers) {
      m = [];
      try {
        const worker = await loadOcrDigits();
        for (let i = 5; i < 7; i++) {
          let val = null;
          for (const inset of [0.1, 0.2, 0.04]) {
            const q = prepCell(src, r.x + i * cw, r.y, cw, r.h, inset);
            if (!q.canvas) continue;
            const { data } = await worker.recognize(q.canvas), digits = String(data.text).replace(/\D/g, '');
            if (digits && data.confidence >= 40 && +digits <= D.animals.markers - 1) { val = +digits; break; }
          }
          m.push(val);
        }
      } catch (e) { m = [null, null]; }
    }
    return { g, m, bad: notes };
  }
  const animalKey = (a) => JSON.stringify(a.g) + '|' + JSON.stringify(a.m);
  function addScannedAnimal(a) {
    if (!document.getElementById('genetics')) return;
    const d = G.draft;
    G.tab = 'animals'; G.amode = 'herd';
    G.draft = { sp: d.sp, sex: d.sex, name: d.name, g: a.g.map((p) => p.slice()), m: [a.m && a.m[0] != null ? a.m[0] : d.m[0], a.m && a.m[1] != null ? a.m[1] : d.m[1]] };
    if (SC.auto) { G.herd.push({ sp: d.sp, sex: d.sex, name: d.name.trim().slice(0, 24), g: G.draft.g.map((p) => p.slice()), m: G.draft.m.slice() }); G.draft.name = ''; save(); SC.msg = '✓ ' + T('зверь добавлен в стадо', 'the animal is added to the herd'); }
    else SC.msg = '✓ ' + T('гены заполнены в форме, проверь и нажми «Добавить в стадо»', 'the genes are filled in the form, check them and press "Add to herd"');
    const keep = window.scrollY; draw(); window.scrollTo(0, keep);
    const m = scEl('gnScanMsg'); if (m) m.textContent = SC.msg;
  }
  function animalReadoutHtml(rd) {
    if (!rd) return '<span class="mut">' + T('Здесь появятся прочитанные круги', 'The circles read will show here') + '</span>';
    const an = { sp: 'cow', sex: 'F', name: '', g: rd.g, m: [rd.m && rd.m[0] != null ? rd.m[0] : 0, rd.m && rd.m[1] != null ? rd.m[1] : 0] };
    return '<span class="apd">' + [0, 1, 2, 3, 4].map((k) => disc(an, k)).join('') + (rd.m ? (rd.m[0] != null ? mdisc(rd.m[0]) : '<span class="ad mk unk"><b>?</b></span>') + (rd.m[1] != null ? mdisc(rd.m[1]) : '<span class="ad mk unk"><b>?</b></span>') : '') + '</span>';
  }
  const colDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  async function readCells(src, r) {
    const worker = await loadOcr(), cw = r.w / 6, out = [];
    for (let i = 0; i < 6; i++) {
      let p = null, letter = '', conf = 0;
      for (const inset of [0.12, 0.2, 0.05]) {
        const q = prepCell(src, r.x + i * cw, r.y, cw, r.h, inset);
        if (!p) p = q;
        if (!q.canvas) continue;
        const { data } = await worker.recognize(q.canvas), l = clean(data.text).charAt(0), c = l ? data.confidence : 0;
        if (c > conf) { letter = l; conf = c; p = q; }
        if (conf >= 75) break;
      }
      let near = null, nd = 1e9;
      Object.entries(SC.colors).forEach(([k, c]) => { const d = colDist(c, p.color); if (d < nd) { nd = d; near = k; } });
      if ((!letter || conf < 55) && near && nd < 55) { letter = near; conf = Math.max(conf, 56); }
      out.push({ letter, conf, color: p.color });
    }
    return out;
  }
  function learnColors(cells) { cells.forEach((c) => { if (!c.letter) return; const o = SC.colors[c.letter]; SC.colors[c.letter] = o ? o.map((v, k) => v * 0.7 + c.color[k] * 0.3) : c.color.slice(); }); try { localStorage.setItem('lima.gene.scancolors', JSON.stringify(SC.colors)); } catch (e) { /* ignore */ } }

  function scanPanel() {
    let p = scEl('gnScan');
    if (p) return p;
    p = document.createElement('div');
    p.id = 'gnScan'; p.className = 'gscan';
    document.body.appendChild(p);
    return p;
  }
  function scanDraw() {
    const p = scanPanel();
    p.style.display = SC.open ? 'block' : 'none';
    if (!SC.open) return;
    const an = SC.kind === 'animal', rd = SC.reading, code = !an && rd ? rd.map((c) => c.letter || '?').join('') : '';
    p.innerHTML = '<div class="gsh"><b>📷 ' + T('Сканер экрана', 'Screen scanner') + '</b><button data-gnscanclose aria-label="close">✕</button></div>'
      + '<p class="mut gsp">' + (an ? T('1. Нажми «Показать экран» и выбери окно игры. 2. Наведи на животное, чтобы открылась панель «Генетика». 3. Обведи мышью ряд из пяти кругов и двух чисел (один раз). Сканер сам читает цвета и числа. Серый круг это обычный ген, красный плохой, зелёный хороший.', '1. Press "Share screen" and pick the game window. 2. Look at an animal so the Genetics panel opens. 3. Drag a frame around the row of five circles and two numbers (once). The scanner reads the colours and the numbers. Grey is an ok gene, red bad, green good.') : T('1. Нажми «Показать экран» и выбери окно игры. 2. Наведи в игре на растение, чтобы появились 6 значков генов. 3. Обведи мышью ряд из 6 значков на картинке ниже (один раз). Дальше сканер читает сам и добавляет клоны.', '1. Press "Share screen" and pick the game window. 2. Aim at a plant in the game so the 6 gene icons show. 3. Drag a frame around the row of 6 icons below (once). Then the scanner reads and adds clones by itself.')) + '</p>'
      + '<div class="gsbar"><button class="btn pri" data-gnscanshare>' + (SC.stream ? '⟳ ' + T('Другой экран', 'Another screen') : '🖥 ' + T('Показать экран', 'Share screen')) + '</button><label class="btn">🖼 ' + T('Скриншот', 'Screenshot') + '<input type="file" accept="image/*" data-gnscanfile hidden></label>' + (SC.stream ? '<button class="btn" data-gnscanstop>⏹ ' + T('Стоп', 'Stop') + '</button>' : '') + '</div>'
      + '<div class="gscw"><canvas id="gnScanCv" width="320" height="180"></canvas></div>'
      + '<div class="gsread' + (an ? ' an' : '') + '">' + (an ? animalReadoutHtml(rd) : rd ? rd.map((c) => '<b class="gl g' + (c.letter || 'X') + (c.letter ? '' : ' unk') + '" title="' + Math.round(c.conf) + '%">' + (c.letter || '?') + '</b>').join('') : '<span class="mut">' + T('Здесь появятся прочитанные буквы', 'Read letters will show here') + '</span>') + '</div>'
      + (an ? '<div class="gsbar"><label class="mut"><input type="checkbox" data-gnscanmk ' + (SC.markers ? 'checked' : '') + '> ' + T('в рамке есть два числа (маркеры)', 'the frame has two numbers (markers)') + '</label></div>' : '<div class="gsbar"><input class="gi" id="gnScanFix" maxlength="6" placeholder="GGYYXX" value="' + esc(valid(code) ? code : '') + '"><button class="btn pri" data-gnscanadd>' + T('Добавить', 'Add') + '</button></div>')
      + '<div class="gsbar"><label class="mut"><input type="checkbox" data-gnscanauto ' + (SC.auto ? 'checked' : '') + '> ' + (an ? T('Сразу добавлять в стадо', 'Add to the herd at once') : T('Добавлять сам', 'Add by itself')) + '</label>' + (an ? '' : '<select data-gnscandest class="gi"><option value="inv"' + (SC.dest === 'inv' ? ' selected' : '') + '>' + T('в мои клоны', 'to my clones') + '</option><option value="nb"' + (SC.dest === 'nb' ? ' selected' : '') + '>' + T('в соседи (вкладка «Что получится»)', 'to neighbours (tab "What you get")') + '</option><option value="own"' + (SC.dest === 'own' ? ' selected' : '') + '>' + T('в центральное растение', 'to the middle plant') + '</option></select>') + '</div>'
      + '<p class="mut gsp" id="gnScanMsg">' + esc(SC.msg) + '</p>';
    scanPreview();
  }
  function scanPreview() {
    const cv = scEl('gnScanCv');
    if (!cv) return;
    const f = SC.full, cx = cv.getContext('2d');
    if (!f) { cx.fillStyle = '#12140d'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = '#7d836f'; cx.font = '14px sans-serif'; cx.fillText(T('Нет картинки', 'No picture'), 12, 24); return; }
    cv.height = Math.round(cv.width * f.height / f.width);
    cx.drawImage(f, 0, 0, cv.width, cv.height);
    const r = SC.drag || SC.region;
    if (r) {
      const X = r.x * cv.width, Y = r.y * cv.height, W = r.w * cv.width, H = r.h * cv.height;
      cx.strokeStyle = '#d4e85a'; cx.lineWidth = 2; cx.strokeRect(X, Y, W, H);
      cx.strokeStyle = 'rgba(212,232,90,.6)'; cx.lineWidth = 1;
      const cellsN = SC.kind === 'animal' ? (SC.markers ? 7 : 5) : 6;
      for (let i = 1; i < cellsN; i++) { cx.beginPath(); cx.moveTo(X + W * i / cellsN, Y); cx.lineTo(X + W * i / cellsN, Y + H); cx.stroke(); }
    }
  }
  function setFull(src) {
    const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    if (!w || !h) return false;
    if (!SC.full) SC.full = document.createElement('canvas');
    SC.full.width = w; SC.full.height = h;
    SC.full.getContext('2d').drawImage(src, 0, 0, w, h);
    return true;
  }
  const absRegion = () => (SC.region && SC.full ? { x: SC.region.x * SC.full.width, y: SC.region.y * SC.full.height, w: SC.region.w * SC.full.width, h: SC.region.h * SC.full.height } : null);
  async function scanOnce() {
    if (SC.busy || !SC.full || !SC.region) return;
    SC.busy = true;
    if (SC.kind === 'animal') {
      try {
        SC.msg = '';
        const a = await readAnimal(SC.full, absRegion()), key = animalKey(a), ok = a.bad.length < 2;
        SC.reading = a;
        if (ok) { SC.miss = 0; if (key === SC.last) SC.stable++; else { SC.last = key; SC.stable = 1; } if (SC.stable >= 2 && key !== SC.added) { SC.added = key; addScannedAnimal(a); } }
        else { SC.stable = 0; if (++SC.miss >= 2) SC.added = ''; }
        const box = document.querySelector('#gnScan .gsread');
        if (box) box.innerHTML = animalReadoutHtml(a);
      } catch (e) { SC.msg = T('Не получилось прочитать панель.', 'Could not read the panel.'); const m = scEl('gnScanMsg'); if (m) m.textContent = SC.msg; }
      SC.busy = false;
      return;
    }
    try {
      SC.msg = '';
      const cells = await readCells(SC.full, absRegion()), code = cells.map((c) => c.letter || '?').join(''), ok = valid(code) && cells.every((c) => c.conf >= 35);
      SC.reading = cells;
      if (ok) { SC.miss = 0; if (code === SC.last) SC.stable++; else { SC.last = code; SC.stable = 1; } if (SC.stable >= 2) learnColors(cells); if (SC.auto && SC.stable >= 2 && code !== SC.added) { SC.added = code; addScanned(code); } }
      else { SC.stable = 0; if (++SC.miss >= 2) SC.added = ''; }
      updateRead(cells, code);
    } catch (e) { SC.msg = T('Не удалось загрузить распознавание текста. Проверь интернет или впиши буквы вручную.', 'Could not load the text recognition. Check the internet or type the letters.'); const m = scEl('gnScanMsg'); if (m) m.textContent = SC.msg; }
    SC.busy = false;
  }
  function updateRead(cells, code) {
    const box = document.querySelector('#gnScan .gsread'), fx = scEl('gnScanFix');
    if (box) box.innerHTML = cells.map((c) => '<b class="gl g' + (c.letter || 'X') + (c.letter ? '' : ' unk') + '" title="' + Math.round(c.conf) + '%">' + (c.letter || '?') + '</b>').join('');
    if (fx && valid(code) && document.activeElement !== fx) fx.value = code;
  }
  function addScanned(code) {
    if (!valid(code) || !document.getElementById('genetics')) return;
    if (SC.dest === 'own') { G.own = code; G.tab = 'plants'; G.pmode = 'cross'; }
    else if (SC.dest === 'nb') { const i = G.neigh.findIndex((x) => !valid(clean(x))); G.tab = 'plants'; G.pmode = 'cross'; if (i >= 0) G.neigh[i] = code; }
    else { G.tab = 'plants'; if (G.pmode === 'guide') G.pmode = 'plan'; (G.inv[G.crop] = G.inv[G.crop] || []).push(code); save(); }
    SC.msg = '✓ ' + T('добавлено ', 'added ') + code;
    const keep = window.scrollY; draw(); window.scrollTo(0, keep);
    const m = scEl('gnScanMsg'); if (m) m.textContent = SC.msg;
  }
  function startTicker(fn, ms) {
    try {
      const w = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},' + ms + ')'], { type: 'text/javascript' })));
      w.onmessage = fn;
      return () => w.terminate();
    } catch (e) { const id = setInterval(fn, ms); return () => clearInterval(id); }
  }
  async function scanShare() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { SC.msg = T('Этот браузер не умеет показывать экран. Используй компьютер и Chrome, Edge или Firefox, либо вставь скриншот.', 'This browser cannot share the screen. Use a computer with Chrome, Edge or Firefox, or paste a screenshot.'); scanDraw(); return; }
    try {
      scanStop(true);
      SC.stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false });
      const v = document.createElement('video');
      v.muted = true; v.srcObject = SC.stream;
      await v.play();
      SC.video = v;
      SC.stream.getVideoTracks()[0].addEventListener('ended', () => scanStop());
      warm().catch(() => {});
      SC.stop = startTicker(() => { if (!document.getElementById('genetics')) { scanStop(); SC.open = false; scanDraw(); return; } if (setFull(SC.video)) { scanPreview(); scanOnce(); } }, 700);
      SC.msg = SC.region ? '' : T('Теперь обведи ряд из 6 значков генов.', 'Now drag a frame around the row of 6 gene icons.');
    } catch (e) { SC.msg = T('Доступ к экрану не дан.', 'Screen access was not granted.'); }
    scanDraw();
  }
  function scanStop(quiet) {
    if (SC.stop) { SC.stop(); SC.stop = null; }
    if (SC.stream) { SC.stream.getTracks().forEach((t) => t.stop()); SC.stream = null; }
    SC.video = null;
    if (!quiet) scanDraw();
  }
  function scanImage(file) {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { scanStop(true); setFull(im); URL.revokeObjectURL(url); SC.msg = SC.region ? '' : T('Обведи ряд из 6 значков генов.', 'Drag a frame around the row of 6 gene icons.'); scanDraw(); warm().then(() => { SC.last = ''; SC.stable = 0; scanOnce(); }).catch(() => {}); };
    im.src = url;
  }
  document.addEventListener('paste', (e) => {
    if (!SC.open) return;
    const it = [...(e.clipboardData ? e.clipboardData.items : [])].find((x) => x.type.indexOf('image') === 0);
    if (it) { e.preventDefault(); scanImage(it.getAsFile()); }
  });
  // frame selection on the preview
  const cvPos = (e) => { const cv = scEl('gnScanCv'), b = cv.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) }; };
  document.addEventListener('pointerdown', (e) => { if (e.target.id === 'gnScanCv' && SC.full) { const p = cvPos(e); SC.drag = { x: p.x, y: p.y, w: 0, h: 0, ox: p.x, oy: p.y }; e.target.setPointerCapture(e.pointerId); } });
  document.addEventListener('pointermove', (e) => { if (SC.drag && e.target.id === 'gnScanCv') { const p = cvPos(e), d = SC.drag; d.x = Math.min(d.ox, p.x); d.y = Math.min(d.oy, p.y); d.w = Math.abs(p.x - d.ox); d.h = Math.abs(p.y - d.oy); scanPreview(); } });
  document.addEventListener('pointerup', () => {
    if (!SC.drag) return;
    const d = SC.drag;
    SC.drag = null;
    if (d.w > 0.02 && d.h > 0.01) { SC.region = { x: d.x, y: d.y, w: d.w, h: d.h }; SC.regions[SC.kind] = SC.region; try { localStorage.setItem('lima.gene.scanrect' + (SC.kind === 'animal' ? '.animal' : ''), JSON.stringify(SC.region)); } catch (e) { /* ignore */ } SC.last = ''; SC.stable = 0; SC.added = ''; scanPreview(); warm().then(scanOnce).catch(() => {}); }
    else scanPreview();
  });

  /* =====================================================  LIVESTOCK  ===================================================== */
  const GLET = ['D', 'L', 'Y', 'F', 'H'];
  const GNAME = { Dung: ['Навоз', 'Dung'], Longevity: ['Долголетие', 'Longevity'], Yield: ['Молоко и шерсть', 'Milk and wool'], Fertility: ['Плодовитость', 'Fertility'], Hardiness: ['Выносливость', 'Hardiness'] };
  const GDESC = {
    Dung: ['Чаще даёт навоз: интервал делится на множитель.', 'Drops dung more often: the interval is divided by the multiplier.'],
    Longevity: ['Взрослый живёт дольше: срок жизни умножается.', 'An adult lives longer: the lifespan is multiplied.'],
    Yield: ['Больше молока или шерсти за раз и короче пауза между сборами.', 'More milk or wool at a time and a shorter pause between harvests.'],
    Fertility: ['Короче паузы между спариваниями и больше приплод.', 'Shorter pauses between matings and bigger litters.'],
    Hardiness: ['Достаточно меньшей сытости и довольства, чтобы быть в отличной форме.', 'Needs less fullness and contentment to stay in top condition.'],
  };
  const ASYM = ['✕', '●', '★'], ALN = [['Плохой', 'Bad'], ['Обычный', 'Ok'], ['Хороший', 'Good']], ACLS = ['aB', 'aO', 'aG'];
  const SPN = { cow: ['Корова', 'Cow', '🐄'], sheep: ['Овца', 'Sheep', '🐑'] };

  const level = (an, i) => Math.max(an.g[i][0], an.g[i][1]);
  const isInbred = (an) => an.m[0] === an.m[1];
  const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
  // the game: trait = expressed / 2, halved by the inbreeding scale; above one half the good multiplier, below it the bad one
  function scaleOf(gene, lv, inbred) {
    const A = D.animals, m = A.mult[gene];
    let t = lv / 2;
    if (inbred) t *= Math.min(1, Math.max(0, A.inbredScale));
    const s = t >= 0.5 ? lerp(1, m.good, t * 2 - 1) : lerp(m.bad, 1, t * 2);
    return Math.max(0.01, s);
  }
  const scalesOf = (an) => D.animals.genes.map((g, i) => scaleOf(g, level(an, i), isInbred(an)));

  function effectsOfAnimal(sp, S) {
    const A = D.animals, s = A.species[sp] || A.species.cow;
    // the game: extra young = multiplier - 1; the whole part is sure, the fraction is the chance of one more; at most maxLitterSize
    const litterExtra = Math.max(0, S[3] - 1), whole = Math.floor(litterExtra), frac = litterExtra - whole, maxL = Math.max(1, A.litter);
    const litter = new Array(maxL).fill(0);
    litter[Math.min(maxL, Math.max(1, 1 + whole)) - 1] += 1 - frac;
    litter[Math.min(maxL, Math.max(1, 2 + whole)) - 1] += frac;    const yieldAmount = sp === 'cow' ? Math.max(1, Math.round((s.milkAmount ?? 1) * S[2])) : s.wool && s.wool[0] ? Math.round(s.wool[0].amount * S[2]) : 0;
    const yieldCd = (sp === 'cow' ? s.milkCooldown : s.shearCooldown) / S[2];
    return {
      dung: s.dungInterval / S[0], life: (s.lifespan * S[1] * A.ageScale), yieldAmount, yieldCd, yieldPerHour: (yieldAmount * 3600) / yieldCd,
      breed: A.breedCooldown / S[3], afterBirth: (s.grow * A.ageScale * A.calvingScale) / S[3], litter,
      content: Math.max(0.01, A.contentment / S[4]), price: Math.max(0, 1 + (S.reduce((a, b) => a + b, 0) / 5 - 1) * A.priceGeneWeight) * (s.saleScale ?? 1),
    };
  }

  // child: one random copy from each parent per gene, one random marker from each parent
  function childReport(mom, dad, sp) {
    const A = D.animals, pairs = [0, 1, 2, 3, 4];
    let match = 0;
    mom.m.forEach((a) => dad.m.forEach((b) => { if (a === b) match++; }));
    const pInbred = match / 4;
    const per = pairs.map((i) => {
      const pm = [0, 0, 0], pf = [0, 0, 0], exp = [0, 0, 0];
      mom.g[i].forEach((a) => (pm[a] += 0.5));
      dad.g[i].forEach((a) => (pf[a] += 0.5));
      for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) exp[Math.max(x, y)] += pm[x] * pf[y];
      const gene = A.genes[i];
      const es = exp.reduce((s, p, lv) => s + p * ((1 - pInbred) * scaleOf(gene, lv, false) + pInbred * scaleOf(gene, lv, true)), 0);
      return { gene, exp, es, good: pm[2] * pf[2], noInb: exp.reduce((s, p, lv) => s + p * scaleOf(gene, lv, false), 0), inb: exp.reduce((s, p, lv) => s + p * scaleOf(gene, lv, true), 0) };
    });
    const S = per.map((x) => x.es);
    return { per, S, avg: S.reduce((a, b) => a + b, 0) / 5, pInbred, allGood: per.reduce((s, x) => s * x.exp[2], 1), god: per.reduce((s, x) => s * x.good, 1), eff: effectsOfAnimal(sp, S) };
  }

  /* ----- pieces of the in-game panel ----- */
  const hue = (n) => 'hsl(' + ((n * 47) % 360) + ',55%,48%)';
  const disc = (an, i) => { const a = an.g[i], hi = Math.max(a[0], a[1]), lo = Math.min(a[0], a[1]); return '<span class="ad ' + ACLS[hi] + '" title="' + T(GNAME[D.animals.genes[i]][0], GNAME[D.animals.genes[i]][1]) + ': ' + T(ALN[hi][0], ALN[hi][1]) + '"><b>' + GLET[i] + '</b><i class="hid ' + ACLS[lo] + '" title="' + T('скрытая копия: ', 'carried copy: ') + T(ALN[lo][0], ALN[lo][1]) + '"></i></span>'; };
  const mdisc = (n) => '<span class="ad mk" style="background:' + hue(n) + '"><b>' + n + '</b></span>';
  function panelHtml(an) {
    const S = scalesOf(an);
    return '<div class="apanel"><div class="aph"><span class="aico">' + SPN[an.sp][2] + '</span><b>' + esc(an.name || T(SPN[an.sp][0], SPN[an.sp][1])) + '</b><span class="mut">' + (an.sex === 'F' ? '♀' : '♂') + '</span></div><div class="apg"><span class="apl">' + T('ГЕНЕТИКА', 'GENETICS') + (isInbred(an) ? '<em>INBRED</em>' : '') + '</span><span class="apd">' + [0, 1, 2, 3, 4].map((i) => disc(an, i)).join('') + mdisc(an.m[0]) + mdisc(an.m[1]) + '</span></div></div>';
  }
  function toggle(who, i, k, v) { return '<button class="al ' + ACLS[v] + '" data-gnal="' + who + ':' + i + ':' + k + '" title="' + T(ALN[v][0], ALN[v][1]) + '">' + ASYM[v] + '</button>'; }
  function editor(who, an, withMeta) {
    const A = D.animals;
    return (withMeta ? '<div class="tq" style="margin-bottom:10px"><select data-gnsp="' + who + '">' + Object.keys(SPN).map((k) => '<option value="' + k + '"' + (an.sp === k ? ' selected' : '') + '>' + SPN[k][2] + ' ' + T(SPN[k][0], SPN[k][1]) + '</option>').join('') + '</select><select data-gnsex="' + who + '"><option value="F"' + (an.sex === 'F' ? ' selected' : '') + '>♀ ' + T('самка', 'female') + '</option><option value="M"' + (an.sex === 'M' ? ' selected' : '') + '>♂ ' + T('самец', 'male') + '</option></select><input data-gnname="' + who + '" list="gnNames" maxlength="24" placeholder="' + T('кличка (по желанию)', 'name (optional)') + '" value="' + esc(an.name) + '"></div>' : '')
      + panelHtml(an) + '<div class="ged">' + A.genes.map((g, i) => '<div class="grow"><span><b><i class="gdot ' + ACLS[level(an, i)] + '">' + GLET[i] + '</i> ' + T(GNAME[g][0], GNAME[g][1]) + '</b><small>' + T(GDESC[g][0], GDESC[g][1]) + '</small></span><span class="gpair">' + toggle(who, i, 0, an.g[i][0]) + toggle(who, i, 1, an.g[i][1]) + '</span></div>').join('') + '</div>'
      + '<div class="gmark"><span><b>' + T('Линия (маркеры)', 'Lineage (markers)') + '</b><small>' + T('Если оба маркера одинаковые, животное инбредное.', 'If both markers are equal the animal is inbred.') + '</small></span>' + [0, 1].map((k) => '<select data-gnmk="' + who + ':' + k + '">' + Array.from({ length: A.markers }, (_, n) => '<option value="' + n + '"' + (an.m[k] === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>').join('') + '</div>';
  }

  function effectsTable(sp, S, eff, note) {
    const s = D.animals.species[sp] || D.animals.species.cow;
    const prod = sp === 'cow' ? T('Молоко за дойку', 'Milk per milking') : T('Шерсть за стрижку', 'Wool per shearing');
    const L = eff.litter.map((p, n) => p > 0.0005 ? (n + 1) + ': ' + Math.round(p * 100) + '%' : '').filter(Boolean).join(' · ');
    return '<div class="ttab">' + [
      [T('Навоз', 'Dung'), 'Dung', S[0], T('раз в ' + fmtSec(eff.dung), 'every ' + fmtSec(eff.dung)), T('база ' + fmtSec(s.dungInterval) + ', разброс ±' + Math.round(s.dungVariance * 100) + '%', 'base ' + fmtSec(s.dungInterval) + ', spread ±' + Math.round(s.dungVariance * 100) + '%')],
      [T('Срок жизни взрослого', 'Adult lifespan'), 'Longevity', S[1], fmtSec(eff.life), T('база ' + fmtSec(s.lifespan) + ', разброс ±' + Math.round(s.variance * 100) + '%', 'base ' + fmtSec(s.lifespan) + ', spread ±' + Math.round(s.variance * 100) + '%')],
      [prod, 'Yield', S[2], num1(eff.yieldAmount, 0) + ' ' + T('шт., раз в ', 'pcs, every ') + fmtSec(eff.yieldCd), num1(eff.yieldPerHour, 1) + ' ' + T('в час', 'per hour')],
      [T('Пауза между спариваниями', 'Pause between matings'), 'Fertility', S[3], fmtSec(eff.breed), T('после родов ≈ ', 'after birth ≈ ') + fmtSec(eff.afterBirth) + ' · ' + T('приплод', 'litter') + ' ' + L],
      [T('Нужно довольства для отличной формы', 'Contentment needed for top condition'), 'Hardiness', S[4], Math.round(eff.content * 100) + '%', T('база ' + Math.round(D.animals.contentment * 100) + '%', 'base ' + Math.round(D.animals.contentment * 100) + '%')],
    ].map(([label, gene, sc, main, sub]) => '<div class="trow"><div class="tn"><b>' + label + '</b></div><div class="tx"><b>×' + num1(sc, 2) + '</b><small>' + T(GNAME[gene][0], GNAME[gene][1]) + '</small></div><div class="tx" style="grid-column:span 2"><b>' + main + '</b><small>' + sub + '</small></div></div>').join('') + '</div><div class="tnote" style="margin-top:12px">' + T('Цена у торговца: ', 'Vendor price: ') + '<b>×' + num1(eff.price, 2) + '</b> ' + T('от базовой (среднее по пяти генам)', 'of the base (average of the five genes)') + (note ? ' · ' + note : '') + '</div>';
  }

  function oneHtml() {
    return '<div class="gone"><div>' + editor('one', G.one, true) + '</div><div id="gnOne"></div></div>';
  }
  function oneRes() {
    const box = document.getElementById('gnOne');
    if (!box) return;
    const S = scalesOf(G.one), eff = effectsOfAnimal(G.one.sp, S);
    box.innerHTML = '<h4 class="tlist" style="margin-top:0">' + T('Что даёт этот зверь', 'What this animal gives') + '</h4>' + (isInbred(G.one) ? '<div class="tnote bad">' + T('Инбредный: показатели урезаны. Хороший ген даёт ×1.0 вместо бонуса, обычный становится хуже обычного, плохой остаётся плохим.', 'Inbred: the stats are cut. A good gene gives ×1.0 instead of the bonus, an ok one becomes worse than ok, a bad one stays bad.') + '</div>' : '') + effectsTable(G.one.sp, S, eff);
  }

  function childHtml() {
    return '<div class="gparents"><div><h4 class="tlist">♀ ' + T('Мать', 'Mother') + '</h4>' + editor('mom', G.mother, true) + '</div><div><h4 class="tlist">♂ ' + T('Отец', 'Father') + '</h4>' + editor('dad', G.father, true) + '</div></div><div id="gnChild"></div>';
  }
  function childRes() {
    const box = document.getElementById('gnChild');
    if (!box) return;
    const r = childReport(G.mother, G.father, G.mother.sp), A = D.animals;
    box.innerHTML = '<div class="tgrid4"><div class="tc best"><b>×' + num1(r.avg, 2) + '</b><small>' + T('средний множитель потомка', 'average multiplier of the young') + '</small></div><div class="tc' + (r.pInbred > 0 ? ' warn' : '') + '"><b>' + Math.round(r.pInbred * 100) + '%</b><small>' + T('шанс инбредного детёныша', 'chance of an inbred young') + '</small></div><div class="tc"><b>' + pct(r.allGood) + '</b><small>' + T('все 5 генов хорошие', 'all 5 genes good') + '</small></div><div class="tc"><b>' + pct(r.god) + '</b><small>' + T('идеал: все 10 копий хорошие', 'perfect: all 10 copies good') + '</small></div></div>'
      + (r.pInbred > 0 ? '<div class="tnote bad">' + T('Родители делят маркер линии, поэтому детёныш может родиться инбредным. Лучше взять пару с разными маркерами.', 'The parents share a lineage marker, so the young can be born inbred. Better pick a pair with different markers.') + '</div>' : '')
      + '<div class="ttab">' + r.per.map((x) => '<div class="trow"><div class="tn"><b><i class="gdot ' + ACLS[2] + '">' + GLET[A.genes.indexOf(x.gene)] + '</i> ' + T(GNAME[x.gene][0], GNAME[x.gene][1]) + '</b></div><div class="tx gbar" style="grid-column:span 2"><div class="gb"><i class="aG" style="width:' + x.exp[2] * 100 + '%"></i><i class="aO" style="width:' + x.exp[1] * 100 + '%"></i><i class="aB" style="width:' + x.exp[0] * 100 + '%"></i></div><small>★ ' + pct(x.exp[2]) + ' · ● ' + pct(x.exp[1]) + ' · ✕ ' + pct(x.exp[0]) + '</small></div><div class="tx"><b>×' + num1(x.es, 2) + '</b><small>' + T('ожидаемо', 'expected') + (r.pInbred > 0 ? ' (' + T('без инбриддинга ×', 'not inbred ×') + num1(x.noInb, 2) + ')' : '') + '</small></div></div>').join('') + '</div>'
      + '<h4 class="tlist">' + T('Ожидаемые показатели детёныша', 'Expected stats of the young') + '</h4>' + effectsTable(G.mother.sp, r.S, r.eff) + timelineHtml(G.mother.sp, r);
  }
  const pct = (p) => (p > 0 && p * 100 < 10 ? (p * 100).toFixed(1) : Math.round(p * 100)) + '%';

  /* ----- names of the animals: the pools of every language of the game, loaded on demand ----- */
  const LTAG = { en: 'EN', de: 'DE', 'es-ES': 'ES', fr: 'FR', 'pt-BR': 'PT', ru: 'RU', tr: 'TR', 'zh-CN': '中' };
  const KIND = { male: ['♂', 'мужское', 'male'], female: ['♀', 'женское', 'female'], unisex: ['⚥', 'любое', 'any'] };
  let nameIdx = null;
  async function loadNames() {
    if (D.names || D.namesLoading) return;
    D.namesLoading = true;
    try { D.names = await (await fetch('names.json')).json(); } catch (e) { D.names = { locales: [], failed: true }; }
    D.namesLoading = false;
    nameIdx = null;
    if (G.tab === 'animals') { const keep = window.scrollY; draw(); window.scrollTo(0, keep); }
  }
  function nameIndex() {
    if (nameIdx || !D.names) return nameIdx;
    nameIdx = new Map();
    D.names.locales.forEach((l) => Object.keys(KIND).forEach((k) => (l[k] || []).forEach((n) => { const key = n.toLowerCase(); if (!nameIdx.has(key)) nameIdx.set(key, []); nameIdx.get(key).push({ loc: l.id, kind: k }); })));
    return nameIdx;
  }
  // the game writes a name as a title: first letter of every word in capitals (Turkish rules for tr)
  const capName = (n, loc) => (loc === 'zh-CN' ? n : n.replace(/(^|[^\p{L}])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase(loc === 'tr' ? 'tr' : undefined)));
  const ordinal = (n) => (n % 100 >= 11 && n % 100 <= 13 ? n + 'th' : n % 10 === 1 ? n + 'st' : n % 10 === 2 ? n + 'nd' : n % 10 === 3 ? n + 'rd' : n + 'th');
  const dynastyName = (stem, gen) => (gen < 2 ? stem : gen === 2 ? stem + ' Junior' : stem + ' the ' + ordinal(gen));
  function parseDynasty(name) {
    const n = (name || '').trim();
    let m = /^(.+) Junior$/.exec(n);
    if (m) return { stem: m[1], gen: 2 };
    m = /^(.+) the (\d+)(?:st|nd|rd|th)$/.exec(n);
    return m && +m[2] >= 3 ? { stem: m[1], gen: +m[2] } : null;
  }
  function nameInfo(name) {
    const n = (name || '').trim();
    if (!n) return null;
    const dyn = parseDynasty(n), stem = dyn ? dyn.stem : n, idx = nameIndex();
    return { dyn, stem, hit: (idx && idx.get(stem.toLowerCase())) || [] };
  }
  function nameChips(ni) {
    if (!ni) return '';
    const seen = {};
    const hits = ni.hit.filter((h) => (seen[h.loc + h.kind] ? false : (seen[h.loc + h.kind] = true))).slice(0, 4);
    return hits.map((h) => '<span class="gbadge nm" title="' + T('имя из списка языка ', 'a name from the list of ') + h.loc + ', ' + T(KIND[h.kind][1], KIND[h.kind][2]) + '">' + (LTAG[h.loc] || h.loc) + ' ' + KIND[h.kind][0] + '</span>').join('') + (ni.dyn ? '<span class="gbadge dyn" title="' + T('Имя по наследству: ' + ni.stem + ', поколение ' + ni.dyn.gen, 'An inherited name: ' + ni.stem + ', generation ' + ni.dyn.gen) + '">' + T('поколение ', 'gen ') + ni.dyn.gen + '</span>' : '');
  }

  /* ----- herd ----- */
  const GOALS = [['all', 'Всё сразу', 'Everything'], ['yield', 'Молоко / шерсть', 'Milk / wool'], ['fert', 'Приплод', 'Offspring'], ['life', 'Долголетие', 'Lifespan'], ['dung', 'Навоз', 'Dung']];
  const goalScore = (r) => (G.goal === 'yield' ? r.S[2] : G.goal === 'fert' ? r.S[3] : G.goal === 'life' ? r.S[1] : G.goal === 'dung' ? r.S[0] : r.avg);
  const cntGood = (an, i) => (an.g[i][0] === 2 ? 1 : 0) + (an.g[i][1] === 2 ? 1 : 0);
  const goodCount = (an) => [0, 1, 2, 3, 4].reduce((s, i) => s + cntGood(an, i), 0);
  const avgScale = (an) => scalesOf(an).reduce((a, b) => a + b, 0) / 5;
  const expGood = (f, m) => [0, 1, 2, 3, 4].reduce((s, i) => s + (cntGood(f, i) + cntGood(m, i)) / 2, 0);
  const codeOf = (herd) => { try { return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, herd })))); } catch (e) { return ''; } };
  const herdFrom = (code) => {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(String(code).trim()))));
      const list = (o && o.herd) || [];
      return list.filter((a) => SPN[a.sp] && (a.sex === 'F' || a.sex === 'M') && Array.isArray(a.g) && a.g.length === 5 && a.g.every((p) => Array.isArray(p) && p.length === 2 && p.every((x) => x >= 0 && x <= 2)) && Array.isArray(a.m) && a.m.length === 2)
        .map((a) => ({ sp: a.sp, sex: a.sex, name: String(a.name || '').slice(0, 24), g: a.g.map((p) => p.slice()), m: a.m.map((x) => Math.max(0, Math.min(D.animals.markers - 1, x | 0))) }));
    } catch (e) { return null; }
  };

  function herdHtml() {
    const edit = G.editIdx >= 0;
    const dl = D.names ? '<datalist id="gnNames">' + (() => { const out = [], seen = {}; D.names.locales.forEach((l) => ['male', 'female', 'unisex'].forEach((k) => (l[k] || []).forEach((n) => { const c = capName(n, l.id); if (!seen[c]) { seen[c] = 1; out.push('<option value="' + esc(c) + '">'); } }))); return out.join(''); })() + '</datalist>' : '';
    return '<div class="gpairform"><div><h4 class="tlist">' + (edit ? T('Правка зверя', 'Editing an animal') : T('Добавить зверя в стадо', 'Add an animal to the herd')) + '</h4>' + editor('draft', G.draft, true) + dl
      + '<div class="tq" style="margin-top:12px"><button class="btn pri" data-gnherdadd>' + (edit ? T('Сохранить изменения', 'Save changes') : T('Добавить в стадо', 'Add to herd')) + '</button>' + (edit ? '<button class="btn" data-gnherdcancel>' + T('Отмена', 'Cancel') + '</button>' : '') + '<button class="btn gscanbtn" data-gnscan="animal">📷 ' + T('Сканер экрана', 'Screen scanner') + '</button></div>'
      + '<p class="mut">' + T('Кличку можно взять из списка: её подсказывают на всех языках игры. Вкладка «Имена» объясняет, откуда берутся клички.', 'The name can be taken from the list: it suggests the names of every language of the game. The tab "Names" explains where the names come from.') + '</p></div>'
      + '<div><h4 class="tlist">' + T('Твоё стадо', 'Your herd') + ' <small class="mut">(' + G.herd.length + ')</small></h4><div id="gnHerd"></div>' + herdTools() + '</div></div>';
  }
  function herdTools() {
    return '<div class="gport"><div class="tq"><button class="btn" data-gnexp>📤 ' + T('Код стада', 'Herd code') + '</button><button class="btn" data-gnimp>📥 ' + T('Загрузить из кода', 'Load from code') + '</button><button class="btn" data-gnherdclear>' + T('Очистить стадо', 'Clear herd') + '</button></div><textarea id="gnPort" rows="2" placeholder="' + T('Здесь появится код стада. Вставь чужой код и нажми «Загрузить из кода».', 'The herd code shows here. Paste a code and press "Load from code".') + '"></textarea></div>';
  }
  function herdCard(a, i) {
    const ni = nameInfo(a.name), good = goodCount(a), inb = isInbred(a);
    return '<div class="gh2' + (G.sel === i ? ' sel' : '') + '"><div class="gh2t"><span class="aico">' + SPN[a.sp][2] + '</span><b>' + (a.sex === 'F' ? '♀' : '♂') + ' ' + esc(a.name || T('без клички', 'no name')) + '</b>' + nameChips(ni) + '</div>'
      + '<span class="apd sm">' + [0, 1, 2, 3, 4].map((k) => disc(a, k)).join('') + mdisc(a.m[0]) + mdisc(a.m[1]) + '</span>'
      + '<div class="gh2m"><span class="gbadge' + (inb ? ' bad' : good >= 10 ? ' good' : '') + '">' + (inb ? 'INBRED' : '★ ' + good + '/10') + '</span><span class="gbadge" title="' + T('средний множитель генов', 'average multiplier of the genes') + '">×' + num1(avgScale(a), 2) + '</span>'
      + '<button class="fc" data-gnherdpick="' + i + '">' + T('партнёры', 'partners') + '</button><button class="fc" data-gnherdedit="' + i + '" aria-label="' + T('править', 'edit') + '">✎</button><button class="fc" data-gnherddel="' + i + '" aria-label="' + T('убрать', 'remove') + '">✕</button></div></div>';
  }
  function aHerdRes() {
    const list = document.getElementById('gnHerd');
    if (!list) return;
    list.innerHTML = G.herd.length ? G.herd.map(herdCard).join('') : '<p class="mut">' + T('Пока пусто. Заполни зверя слева (или включи сканер) и нажми «Добавить в стадо».', 'Empty so far. Fill in an animal on the left (or turn on the scanner) and press "Add to herd".') + '</p>';
  }

  /* ----- best pair of the herd ----- */
  function pairHtml() {
    return '<p class="mut">' + T('Звери берутся из вкладки «Мой скот». Выбери цель, и сайт поставит пары по порядку.', 'The animals come from the tab "My herd". Pick a goal and the site ranks the pairs.') + '</p><div class="fch">' + GOALS.map((g) => '<button class="fc' + (G.goal === g[0] ? ' on' : '') + '" data-gngoal="' + g[0] + '">' + T(g[1], g[2]) + '</button>').join('') + '</div><div id="gnPairs"></div>';
  }
  function aPairRes() {
    const pairs = document.getElementById('gnPairs');
    if (!pairs) return;
    const pick = G.sel >= 0 && G.herd[G.sel] ? G.herd[G.sel] : null, rows = [];
    G.herd.forEach((f) => { if (f.sex !== 'F') return; G.herd.forEach((m) => { if (m.sex === 'M' && m.sp === f.sp && (!pick || f === pick || m === pick)) rows.push({ f, m, r: childReport(f, m, f.sp) }); }); });
    if (!rows.length) { pairs.innerHTML = '<div class="tnote">' + T('Нужны самка и самец одного вида во вкладке «Мой скот». Тогда здесь появится рейтинг пар.', 'Add a female and a male of the same species in the tab "My herd" and the ranking of pairs appears here.') + '</div>'; return; }
    rows.sort((p, q) => goalScore(q.r) - goalScore(p.r) || q.r.god - p.r.god);
    pairs.innerHTML = (pick ? '<div class="tnote">' + T('Партнёры для: ', 'Partners for: ') + '<b>' + esc(pick.name || SPN[pick.sp][0]) + '</b> <button class="fc" data-gnherdpick="-1">' + T('показать все пары', 'show all pairs') + '</button></div>' : '')
      + '<h4 class="tlist">' + T('Лучшие пары', 'Best pairs') + '</h4><div class="ttab">' + rows.slice(0, 10).map((x, i) => '<div class="trow' + (i === 0 ? ' best' : '') + '"><div class="tn"><b>♀ ' + esc(x.f.name || '?') + ' + ♂ ' + esc(x.m.name || '?') + '</b>' + (i === 0 ? '<span class="ub new">' + T('лучшая', 'best') + '</span>' : '') + (x.r.pInbred > 0 ? '<span class="ub">⚠ ' + T('риск инбридинга ', 'inbred risk ') + Math.round(x.r.pInbred * 100) + '%</span>' : '<span class="ub">✓ ' + T('без инбридинга', 'no inbreeding') + '</span>') + '</div><div class="tx"><b>×' + num1(goalScore(x.r), 2) + '</b><small>' + T('по цели', 'for the goal') + '</small></div><div class="tx"><b>' + num1(expGood(x.f, x.m), 1) + '</b><small>' + T('★ копий из 10', '★ copies of 10') + '</small></div><div class="tx"><b>' + pct(x.r.god) + '</b><small>' + T('идеал', 'perfect') + '</small></div></div>').join('') + '</div>' + timelineHtml(rows[0].f.sp, rows[0].r);
  }

  /* ----- the way to a perfect animal: the herd, bred generation after generation, simulated on the exact rules of the game ----- */
  const mulberryA = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function planSim(pool, genes, K, runs) {
    const rnd = mulberryA(20261024), need = genes.length * 2;
    const fit = (an) => genes.reduce((s, i) => s + cntGood(an, i), 0);
    const score = (an) => fit(an) * 10 + (isInbred(an) ? -5 : 0) + avgScale(an);
    const pInb = (a, b) => { let n = 0; a.m.forEach((x) => b.m.forEach((y) => { if (x === y) n++; })); return n / 4; };
    const results = [];
    for (let run = 0; run < runs; run++) {
      let males = pool.filter((a) => a.sex === 'M').map((a) => ({ g: a.g, m: a.m, sex: 'M' })), females = pool.filter((a) => a.sex === 'F').map((a) => ({ g: a.g, m: a.m, sex: 'F' }));
      let done = -1;
      for (let cycle = 0; cycle <= 60; cycle++) {
        const perfect = (a) => fit(a) === need && !isInbred(a);
        if (males.some(perfect) && females.some(perfect)) { done = cycle; break; }
        let best = null;
        males.slice(0, 4).forEach((m) => females.slice(0, 4).forEach((f) => { const j = genes.reduce((s, i) => s + (cntGood(m, i) + cntGood(f, i)) / 2, 0) - 6 * pInb(m, f); if (!best || j > best.j) best = { m, f, j }; }));
        if (!best) break;
        const kids = [];
        for (let k = 0; k < K; k++) {
          const g = best.f.g.map((p, i) => [p[rnd() < 0.5 ? 0 : 1], best.m.g[i][rnd() < 0.5 ? 0 : 1]]);
          kids.push({ g, m: [best.f.m[rnd() < 0.5 ? 0 : 1], best.m.m[rnd() < 0.5 ? 0 : 1]], sex: rnd() < 0.5 ? 'M' : 'F' });
        }
        males = males.concat(kids.filter((k) => k.sex === 'M')).sort((a, b) => score(b) - score(a)).slice(0, 4);
        females = females.concat(kids.filter((k) => k.sex === 'F')).sort((a, b) => score(b) - score(a)).slice(0, 4);
      }
      results.push(done);
    }
    const ok = results.filter((x) => x >= 0).sort((a, b) => a - b);
    return { success: ok.length / runs, median: ok.length ? ok[Math.floor(ok.length / 2)] : null, p90: ok.length ? ok[Math.min(ok.length - 1, Math.floor(ok.length * 0.9))] : null };
  }
  function planHtml() {
    const A = D.animals;
    return '<p class="mut">' + T('Сайт берёт твоё стадо и показывает, как дойти до идеального зверя: какие гены закрепляем, сколько кругов размножения нужно и чего не хватает.', 'The site takes your herd and shows how to reach a perfect animal: which genes to fix, how many breeding rounds it takes and what is missing.') + '</p><div class="tq">'
      + '<select data-gnplan="sp" class="gi">' + Object.keys(SPN).map((k) => '<option value="' + k + '"' + (G.plan.sp === k ? ' selected' : '') + '>' + SPN[k][2] + ' ' + T(SPN[k][0], SPN[k][1]) + '</option>').join('') + '</select>'
      + '<label class="mut">' + T('детёнышей за круг', 'young per round') + ' <input class="gi" type="number" min="1" max="8" value="' + G.plan.k + '" data-gnplan="k" style="width:70px"></label></div>'
      + '<div class="fch">' + A.genes.map((g, i) => '<label class="gpg"><input type="checkbox" data-gnplan="g' + i + '"' + (G.plan.genes[i] ? ' checked' : '') + '> <i class="gdot ' + ACLS[2] + '">' + GLET[i] + '</i> ' + T(GNAME[g][0], GNAME[g][1]) + '</label>').join('') + '</div><div id="gnPlanRes"></div>';
  }
  function aPlanRes() {
    const box = document.getElementById('gnPlanRes');
    if (!box) return;
    const A = D.animals, sp = G.plan.sp, genes = [0, 1, 2, 3, 4].filter((i) => G.plan.genes[i]), pool = G.herd.filter((a) => a.sp === sp), c = A.species[sp] || A.species.cow;
    if (!genes.length) { box.innerHTML = '<div class="tnote bad">' + T('Отметь хотя бы один ген цели.', 'Tick at least one target gene.') + '</div>'; return; }
    const males = pool.filter((a) => a.sex === 'M'), females = pool.filter((a) => a.sex === 'F');
    if (!males.length || !females.length) { box.innerHTML = '<div class="tnote bad">' + T('Для плана нужны самец и самка этого вида. Добавь их во вкладке «Мой скот».', 'The plan needs a male and a female of this species. Add them in the tab "My herd".') + '</div>'; return; }
    const total = (i) => pool.reduce((s, a) => s + cntGood(a, i), 0), missing = genes.filter((i) => total(i) === 0);
    const sim = planSim(pool, genes, Math.max(1, G.plan.k | 0), 300), cycle = c.pregnancy + c.grow;
    const rows = genes.map((i) => { const have = total(i), carriers = pool.filter((a) => cntGood(a, i) > 0).length; return '<div class="trow"><div class="tn"><b><i class="gdot ' + ACLS[2] + '">' + GLET[i] + '</i> ' + T(GNAME[A.genes[i]][0], GNAME[A.genes[i]][1]) + '</b></div><div class="tx"><b>' + have + '</b><small>' + T('хороших копий в стаде', 'good copies in the herd') + '</small></div><div class="tx"><b>' + carriers + '/' + pool.length + '</b><small>' + T('зверей с ★', 'animals with ★') + '</small></div><div class="tx">' + (have === 0 ? '<b class="bad">' + T('нет', 'none') + '</b>' : have < 2 ? '<small>' + T('мало', 'few') + '</small>' : '<small>' + T('есть', 'ok') + '</small>') + '</div></div>'; }).join('');
    const wildOne = 1 - Math.pow(1 - A.goodChance, 2);
    let best = null;
    males.forEach((m) => females.forEach((f) => { const j = genes.reduce((s, i) => s + (cntGood(m, i) + cntGood(f, i)) / 2, 0) - 6 * childReport(f, m, sp).pInbred; if (!best || j > best.j) best = { m, f, j }; }));
    box.innerHTML = (missing.length ? '<div class="tnote bad">⛔ ' + T('В стаде нет ни одной хорошей копии для: ', 'The herd has no good copy for: ') + missing.map((i) => GLET[i]).join(', ') + '. ' + T('Мутаций на сервере нет, поэтому такой ген не появится сам. Поймай диких зверей: у каждого дикого шанс ★ на этом гене ' + Math.round(wildOne * 100) + '%, значит в среднем нужно ' + Math.ceil(1 / wildOne) + ' зверя на ген.', 'There are no mutations on the server, so such a gene will not appear by itself. Catch wild animals: a wild animal has a ' + Math.round(wildOne * 100) + '% chance of ★ on this gene, so about ' + Math.ceil(1 / wildOne) + ' animals per gene are needed.') + '</div>' : '')
      + '<div class="tgrid4"><div class="tc best"><b>' + (sim.median === null ? '—' : sim.median) + '</b><small>' + T('кругов размножения (типично)', 'breeding rounds (typical)') + '</small></div><div class="tc"><b>' + (sim.p90 === null ? '—' : sim.p90) + '</b><small>' + T('кругов в неудачных случаях', 'rounds in unlucky cases') + '</small></div><div class="tc"><b>' + Math.round(sim.success * 100) + '%</b><small>' + T('случаев доходят до идеала', 'runs that reach perfection') + '</small></div><div class="tc"><b>' + (sim.median === null ? '—' : fmtSec(sim.median * cycle)) + '</b><small>' + T('времени (круг ' + fmtSec(cycle) + ')', 'time (a round is ' + fmtSec(cycle) + ')') + '</small></div></div>'
      + '<h4 class="tlist">' + T('Что делать сейчас', 'What to do now') + '</h4><ol class="gsteps2">'
      + '<li class="gst"><b class="gno">1</b><span><b>' + T('Скрести лучшую пару', 'Breed the best pair') + '</b><small>♀ ' + esc(best.f.name || '?') + ' + ♂ ' + esc(best.m.name || '?') + ' · ' + T('★ копий цели в среднем ', 'target ★ copies on average ') + num1(genes.reduce((s, i) => s + (cntGood(best.m, i) + cntGood(best.f, i)) / 2, 0), 1) + ' ' + T('из ', 'of ') + genes.length * 2 + '</small></span></li>'
      + '<li class="gst"><b class="gno">2</b><span><b>' + T('Оставь лучших детёнышей', 'Keep the best young') + '</b><small>' + T('Для каждого пола оставляй детёныша с наибольшим числом ★ в генах цели. Одинаковые маркеры (INBRED) не оставляй: инбред режет показатели.', 'For each sex keep the young with the most ★ in the target genes. Do not keep equal markers (INBRED): inbreeding cuts the stats.') + '</small></span></li>'
      + '<li class="gst"><b class="gno">3</b><span><b>' + T('Повтори с новым поколением', 'Repeat with the new generation') + '</b><small>' + T('Подожди, пока детёныши вырастут (' + fmtSec(c.grow) + '), добавь их во вкладку «Мой скот» и обнови план. Идеал достигнут, когда есть и самец, и самка без инбридинга со всеми копиями цели ★.', 'Wait until the young grow up (' + fmtSec(c.grow) + '), add them to the tab "My herd" and refresh the plan. The goal is reached when there is a male and a female without inbreeding with every target copy ★.') + '</small></span></li></ol>'
      + '<h4 class="tlist">' + T('Узкие места по генам', 'Gene bottlenecks') + '</h4><div class="ttab">' + rows + '</div><p class="mut">' + T('План считается по точным правилам игры: детёныш берёт случайную копию гена у каждого родителя. Цифры получены 300 симуляциями, поэтому «типично» это среднее значение, а не гарантия.', 'The plan uses the exact rules of the game: the young takes a random copy of a gene from each parent. The numbers come from 300 simulations, so "typical" is a median and not a promise.') + '</p>';
  }

  /* ---------- livestock: timeline of one breeding round and the question list ---------- */
  function timelineHtml(sp, r) {
    const A = D.animals, c = A.species[sp] || A.species.cow, eff = r.eff, L = eff.litter.map((p, n) => (p > 0.0005 ? (n + 1) + ': ' + Math.round(p * 100) + '%' : '')).filter(Boolean).join(' · ');
    const steps = [
      [T('Поставь пару рядом', 'Put the pair together'), T('Самец и самка должны быть взрослыми и стоять ближе ' + A.breedRadius + ' м. Состояние обоих выше ' + Math.round(A.breedResume * 100) + '%, иначе они не спариваются.', 'The male and the female must be adult and closer than ' + A.breedRadius + ' m. Both need a condition above ' + Math.round(A.breedResume * 100) + '% or they do not mate.'), T('сразу', 'right away')],
      [T('Беременность', 'Pregnancy'), T('Самка вынашивает детёныша.', 'The female carries the young.'), fmtSec(c.pregnancy)],
      [T('Рождение', 'Birth'), T('Помёт (число детёнышей): ', 'Litter (number of young): ') + L + '.', T('через ', 'after ') + fmtSec(c.pregnancy)],
      [T('Детёныш растёт', 'The young grows'), T('Взрослым он станет не сразу. Проверь его гены на панели и оставь лучших.', 'It is not adult at once. Check its genes on the panel and keep the best.'), fmtSec(c.grow)],
      [T('Следующее спаривание матери', 'The next mating of the mother'), T('Пауза делится на множитель плодовитости (' + num1(r.S[3], 2) + ').', 'The pause is divided by the fertility multiplier (' + num1(r.S[3], 2) + ').'), fmtSec(eff.breed)],
    ];
    return '<h4 class="tlist">' + T('Когда что произойдёт', 'What happens and when') + '</h4><div class="gtl">' + steps.map((s, i) => '<div class="gtl1"><b class="gno">' + (i + 1) + '</b><span><b>' + s[0] + '</b><small>' + s[1] + '</small></span><em>' + s[2] + '</em></div>').join('') + '</div><p class="mut">' + T('От спаривания до взрослого потомка примерно ' + fmtSec(c.pregnancy + c.grow) + '.', 'From mating to an adult young about ' + fmtSec(c.pregnancy + c.grow) + '.') + '</p>';
  }
  function faqAnimals() {
    const A = D.animals, c = A.species.cow;
    return '<div class="ghow"><h4>' + T('Вопросы и ответы по животным', 'Questions and answers about livestock') + '</h4>' + faq([
      [T('Что значат круги D, L, Y, F, H?', 'What do the circles D, L, Y, F, H mean?'), T('Это пять генов: D навоз, L долголетие, Y молоко и шерсть, F плодовитость, H выносливость. Цвет круга: зелёный хороший ген, серый обычный, красный плохой. Точка в круге это скрытая копия.', 'These are the five genes: D dung, L longevity, Y milk and wool, F fertility, H hardiness. The colour: green good gene, grey ok, red bad. The dot in the circle is the carried copy.'), 'g'],
      [T('Что за цветные числа справа?', 'What are the coloured numbers on the right?'), T('Это два маркера линии, числа от 0 до ' + (A.markers - 1) + '. Они не говорят о качестве. Нужны только чтобы понять родство: одинаковые маркеры дают инбридинг.', 'These are the two lineage markers, numbers from 0 to ' + (A.markers - 1) + '. They say nothing about quality. They only show kinship: equal markers mean inbreeding.'), 'g'],
      [T('Что такое INBRED и как его избежать?', 'What is INBRED and how to avoid it?'), T('Если оба маркера зверя одинаковые, он инбредный и его показатели урезаются. Детёныш получает по одному маркеру от каждого родителя, поэтому ищи пары, у которых нет общих маркеров: тогда шанс инбридинга 0%. Если один маркер общий, шанс 25%, если два, 50% или 100%.', 'If both markers of an animal are equal it is inbred and its stats are cut. The young takes one marker from each parent, so look for pairs with no common marker: then the inbred chance is 0%. One common marker gives 25%, two give 50% or 100%.'), 'g'],
      [T('Как гены переходят к детёнышу?', 'How do genes pass to the young?'), T('По каждому гену детёныш получает одну случайную копию от матери и одну от отца, по 50%. Если у матери обе копии хорошие, она передаст хорошую всегда.', 'For every gene the young gets one random copy from the mother and one from the father, 50% each. If both copies of the mother are good she always passes a good one.'), 'g'],
      [T('Как вывести идеал?', 'How to breed a perfect animal?'), T('Цель: у обоих родителей обе копии каждого гена хорошие, тогда детёныш родится идеальным. Каждое поколение оставляй самых зелёных детёнышей, скрещивай их между собой и следи за маркерами. Вкладки «Подбор пары» и «План до идеала» считают шанс идеала и сколько кругов нужно.', 'The goal: both parents have both copies of every gene good, then the young is perfect. Keep the greenest young each generation, cross them and watch the markers. The tabs "Best pair" and "Way to perfect" count the chance of perfection and the number of rounds.'), 'g'],
      [T('Что даёт хороший и плохой ген?', 'What do a good and a bad gene give?'), A.genes.map((g) => T(GNAME[g][0], GNAME[g][1]) + ': ✕ ×' + A.mult[g].bad + ', ★ ×' + A.mult[g].good).join('; ') + '.', 'g'],
      [T('Сколько ждать до потомка?', 'How long to wait for the young?'), T('Беременность ' + fmtSec(c.pregnancy) + ', потом детёныш растёт ' + fmtSec(c.grow) + '. Пауза между спариваниями ' + fmtSec(A.breedCooldown) + ', её делит множитель плодовитости.', 'Pregnancy ' + fmtSec(c.pregnancy) + ', then the young grows for ' + fmtSec(c.grow) + '. The pause between matings is ' + fmtSec(A.breedCooldown) + ', divided by the fertility multiplier.'), 'g'],
      [T('Бывают ли мутации?', 'Are there mutations?'), A.mutation > 0 ? T('Да, ' + Math.round(A.mutation * 100) + '%.', 'Yes, ' + Math.round(A.mutation * 100) + '%.') : T('На нашем сервере мутации выключены.', 'Mutations are off on our server.'), 'g'],
      [T('Какие дикие звери встречаются?', 'What wild animals are there?'), T('У каждой копии гена ' + Math.round(A.goodChance * 100) + '% быть хорошей и ' + Math.round(A.badChance * 100) + '% плохой. С шансом ' + num1(A.specialChance * 100, 1) + '% попадается особый зверь. Особых можно скрещивать: смотри вкладку «Особые».', 'Every gene copy is good with ' + Math.round(A.goodChance * 100) + '% and bad with ' + Math.round(A.badChance * 100) + '%. With ' + num1(A.specialChance * 100, 1) + '% a special animal shows up. Special ones can be crossed: see the tab "Special".'), 'g'],
      [T('От чего зависит цена у торговца?', 'What decides the vendor price?'), T('От среднего значения пяти генов: чем зеленее, тем дороже.', 'The average of the five genes: the greener, the more expensive.'), 'g'],
      [T('У каких животных есть гены?', 'Which animals have genes?'), T('Гены D, L, Y, F, H есть у коров и овец.', 'The genes D, L, Y, F, H exist for cows and sheep.'), 'g'],
      [T('Почему у зверей клички на разных языках?', 'Why do the animals have names in different languages?'), T('Кличка выбирается один раз при появлении зверя. Язык берётся случайно: вес ' + (A.names ? A.names.baseline : 5) + ' у языка сервера и по 1 за каждого игрока онлайн с таким языком игры. Подробности и списки всех языков во вкладке «Имена».', 'The name is picked once when the animal appears. The language is random: weight ' + (A.names ? A.names.baseline : 5) + ' for the server language and 1 for every player online with that game language. Details and the lists of every language are in the tab "Names".'), 'g'],
      [T('Что значит «Junior» и «the 3rd» в кличке?', 'What do "Junior" and "the 3rd" in a name mean?'), T('Это имя по наследству. Детёныш того же пола, что родитель, получает его имя: второе поколение «Имя Junior», третье «Имя the 3rd» и дальше. Так видно линию отца у быков и линию матери у коров. Длиннее 24 знаков имя не бывает.', 'This is an inherited name. A young of the same sex as the parent gets its name: the second generation is "Name Junior", the third "Name the 3rd" and so on. This shows the father line of bulls and the mother line of cows. A name is never longer than 24 characters.'), 'g'],
      [T('Что такое особый зверь?', 'What is a special animal?'), T('Дикий зверь с заданными генами и своим именем. Появляется с шансом ' + num1(A.specialChance * 100, 1) + '%, пока жив, второго с таким именем нет. Гены каждого особого и рецепты скрещивания во вкладке «Особые».', 'A wild animal with set genes and its own name. It shows up with a chance of ' + num1(A.specialChance * 100, 1) + '%, while it lives there is no second one with the same name. The genes of every special animal and the crossing recipes are in the tab "Special".'), 'g'],
      [T('Сколько нужно поколений до идеала?', 'How many generations to a perfect animal?'), T('Зависит от стада. Вкладка «План до идеала» симулирует размножение по правилам игры и показывает типичное число кругов и время.', 'It depends on the herd. The tab "Way to perfect" simulates breeding by the rules of the game and shows the typical number of rounds and time.'), 'g'],
      [T('Можно ли сканировать гены с экрана?', 'Can the genes be scanned from the screen?'), T('Да. Во вкладке «Мой скот» нажми «Сканер экрана», покажи окно игры и обведи ряд из пяти кругов и двух чисел. Сканер читает цвета кругов и числа. Проверь результат: цвета в игре бывают разными.', 'Yes. In the tab "My herd" press "Screen scanner", share the game window and drag a frame around the row of five circles and two numbers. The scanner reads the colours of the circles and the numbers. Check the result: colours differ between game settings.'), 'c'],
    ]) + '</div>';
  }

  /* ----- special animals: forced genes, how to find them and what to cross ----- */
  function specialHtml() {
    const A = D.animals, list = A.specialsFull || [], by = Object.fromEntries(list.map((s) => [s.name, s]));
    const spName = (s) => (s.species.length ? s.species.map((k) => SPN[k][2] + ' ' + T(SPN[k][0], SPN[k][1])).join(', ') : T('любой вид', 'any species'));
    const chanceFor = (s, sp) => {
      const total = list.filter((x) => (!x.species.length || x.species.indexOf(sp) >= 0) && x.sex === s.sex && x.weight > 0).reduce((q, x) => q + x.weight, 0);
      return total > 0 ? A.specialChance * s.weight / total : 0;
    };
    const card = (s) => {
      const an = { sp: s.species[0] || 'cow', sex: s.sex, name: s.name, g: s.genes, m: [0, 1] }, S = scalesOf(Object.assign({}, an, { m: [0, 1] }));
      const kinds = s.species.length ? s.species : Object.keys(SPN), good = goodCount(an);
      return '<div class="card gspc"><div class="gspt"><b>' + (s.sex === 'F' ? '♀' : '♂') + ' ' + esc(s.name) + '</b>' + (s.allowBad ? '<span class="gbadge bad" title="' + T('Может быть с плохими генами по задумке', 'May have bad genes by design') + '">⚠ ' + T('есть плохие гены', 'has bad genes') + '</span>' : '<span class="gbadge good">' + T('без плохих генов', 'no bad genes') + '</span>') + '</div>'
        + '<p class="mut">' + spName(s) + '</p><span class="apd sm">' + [0, 1, 2, 3, 4].map((k) => disc(an, k)).join('') + '</span>'
        + '<div class="gh2m"><span class="gbadge">★ ' + good + '/10</span><span class="gbadge">×' + num1(S.reduce((a, b) => a + b, 0) / 5, 2) + '</span></div>'
        + '<p class="mut">' + kinds.map((sp) => { const p = chanceFor(s, sp); return p > 0 ? SPN[sp][2] + ' ' + T('шанс 1 из ', 'chance 1 in ') + Math.round(1 / p).toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU') : ''; }).filter(Boolean).join(' · ') + ' <small>' + T('(для нового дикого зверя этого вида и пола)', '(for a new wild animal of this species and sex)') + '</small></p></div>';
    };
    const kids = {};
    (A.crossesFull || A.crosses.map((c) => ({ a: c.a, b: c.b, child: c.child }))).forEach((c) => (kids[c.child] = c));
    const sx = (n) => (by[n] ? (by[n].sex === 'F' ? '♀' : '♂') : '');
    return '<p class="mut">' + T('Особый зверь это животное с заданными генами и своим именем. Он появляется только среди диких, шанс ' + num1(A.specialChance * 100, 1) + '%, и пока он жив, второго с таким же именем не будет.', 'A special animal has set genes and its own name. It shows up only among wild ones with a chance of ' + num1(A.specialChance * 100, 1) + '%, and while it lives there is no second one with the same name.') + '</p>'
      + '<div class="gspecs">' + list.map(card).join('') + '</div>'
      + '<h4 class="tlist">' + T('Что с чем скрещивать', 'What to cross with what') + '</h4><p class="mut">' + T('Скрести двух особых зверей по таблице (мать и отец, разные пол). Детёныш получит новое особое имя, а гены по обычным правилам от родителей.', 'Cross two special animals by the table (mother and father, different sexes). The young gets a new special name and its genes by the usual rules from the parents.') + '</p>'
      + '<div class="ttab">' + Object.values(kids).map((c) => '<div class="trow gcr"><div class="tn"><b>' + sx(c.a) + ' ' + esc(c.a) + '</b><span class="mut">+</span><b>' + sx(c.b) + ' ' + esc(c.b) + '</b></div><div class="tx" style="grid-column:span 3"><b>→ ' + esc(c.child) + '</b></div></div>').join('') + '</div>';
  }

  /* ----- names: where they come from, what they mean and a finder ----- */
  function namesHtml() {
    if (!D.names) { loadNames(); return '<p class="mut" style="text-align:center">' + T('Загрузка списков имён…', 'Loading the name lists…') + '</p>'; }
    if (D.names.failed) return '<p class="mut">' + T('Не удалось загрузить имена.', 'Could not load the names.') + '</p>';
    const loc = D.names.locales.find((l) => l.id === G.nameLoc) || D.names.locales[0], q = G.nameq.trim().toLowerCase();
    const idx = nameIndex(), hits = q ? [...idx.entries()].filter(([k]) => k.indexOf(q) >= 0).slice(0, 40) : [];
    const pool = (k) => (loc[k] || []).filter((n) => !q || n.toLowerCase().indexOf(q) >= 0);
    const chips = (k) => pool(k).map((n) => '<span class="gchip">' + esc(capName(n, loc.id)) + '</span>').join('');
    const weights = D.names.locales.map((l) => ({ id: l.id, label: l.label, w: (l.id === D.names.house ? D.names.baseline : 0) + (+G.pplay[l.id] || 0) })), sum = weights.reduce((s, w) => s + w.w, 0);
    const dyn = parseDynasty(G.dynq) || (G.dynq.trim() ? { stem: G.dynq.trim(), gen: 1 } : null);
    return '<div class="ghow"><h4>' + T('Откуда берутся клички', 'Where the names come from') + '</h4><ul class="gl2"><li>' + T('Новорождённый и дикий зверь получает кличку один раз, при появлении. Дальше она не меняется.', 'A newborn and a wild animal gets its name once, when it appears. The name never changes.') + '</li><li>' + T('Язык клички выбирается случайно. Вес языка: ' + D.names.baseline + ' у языка сервера (' + D.names.house + ') плюс 1 за каждого игрока онлайн с таким языком игры. Поэтому на сервере с русскими игроками много русских кличек.', 'The language of the name is picked at random. The weight of a language: ' + D.names.baseline + ' for the server language (' + D.names.house + ') plus 1 for every player online who plays in that language. So a server with Russian players has many Russian names.') + '</li><li>' + T('Из списка выбранного языка берётся случайное имя нужного пола (мужское или женское) или универсальное. Кличка не длиннее ' + D.names.maxLength + ' знаков.', 'A random name of the right sex (male or female) or a unisex one is taken from the list of that language. A name is at most ' + D.names.maxLength + ' characters long.') + '</li><li>' + T('Имя по наследству: детёныш того же пола, что родитель, может получить его имя с приставкой. Второе поколение «Имя Junior», дальше «Имя the 3rd», «Имя the 4th» и так до 20. Так видно линию отца у быков и линию матери у коров.', 'Inherited name: a young of the same sex as the parent can get its name with a suffix. The second generation is "Name Junior", then "Name the 3rd", "Name the 4th" up to 20. This shows the father line of bulls and the mother line of cows.') + '</li></ul></div>'
      + '<h4 class="tlist">' + T('Найти имя', 'Find a name') + '</h4><div class="tq"><input class="gi" id="gnNameQ" placeholder="' + T('часть имени на любом языке', 'part of a name in any language') + '" value="' + esc(G.nameq) + '"></div>'
      + (q ? '<div class="gchips">' + (hits.length ? hits.map(([k, v]) => '<span class="gchip"><b>' + esc(capName(k, v[0].loc)) + '</b> ' + v.map((h) => '<i>' + (LTAG[h.loc] || h.loc) + ' ' + KIND[h.kind][0] + '</i>').join(' ') + '</span>').join('') : '<span class="mut">' + T('Такого имени нет в списках.', 'No such name in the lists.') + '</span>') + '</div>' : '')
      + '<div class="fch">' + D.names.locales.map((l) => '<button class="fc' + (l.id === loc.id ? ' on' : '') + '" data-gnloc="' + l.id + '">' + esc(l.label) + ' <small>' + (l.male.length + l.female.length + l.unisex.length) + '</small></button>').join('') + '</div>'
      + ['male', 'female', 'unisex'].map((k) => '<h4 class="tlist">' + KIND[k][0] + ' ' + T(KIND[k][1], KIND[k][2]) + ' <small class="mut">(' + pool(k).length + ')</small></h4><div class="gchips">' + (chips(k) || '<span class="mut">—</span>') + '</div>').join('')
      + '<h4 class="tlist">' + T('Родословная по имени', 'Lineage by name') + '</h4><div class="tq"><input class="gi" id="gnDynQ" placeholder="' + T('например: Иван the 3rd или Maria Junior', 'for example: Ivan the 3rd or Maria Junior') + '" value="' + esc(G.dynq) + '"></div>'
      + (dyn ? '<div class="tnote">' + T('Основатель линии: ', 'Founder of the line: ') + '<b>' + esc(dyn.stem) + '</b> · ' + T('поколение ', 'generation ') + dyn.gen + (nameChips(nameInfo(dyn.stem)) ? ' ' + nameChips(nameInfo(dyn.stem)) : '') + '</div><div class="gchips">' + Array.from({ length: 20 }, (_, i) => i + 1).map((g) => { const n = dynastyName(dyn.stem, g); return '<span class="gchip' + (g === dyn.gen ? ' on' : '') + (n.length > D.names.maxLength ? ' mut' : '') + '"><i>' + g + '</i> ' + esc(n) + (n.length > D.names.maxLength ? ' ✕' : '') + '</span>'; }).join('') + '</div><p class="mut">' + T('Если имя длиннее ' + D.names.maxLength + ' знаков, наследование обрывается: детёныш получает новую кличку. ✕ значит «слишком длинно».', 'If a name is longer than ' + D.names.maxLength + ' characters the inheritance stops and the young gets a new name. ✕ means too long.') + '</p>' : '')
      + '<h4 class="tlist">' + T('Какой язык будет у следующей клички', 'Which language the next name gets') + '</h4><p class="mut">' + T('Впиши, сколько игроков онлайн играют на каждом языке.', 'Enter how many players online play in each language.') + '</p><div class="gplayers">' + weights.map((w) => '<label class="gcl"><span>' + esc(w.label) + ' <b>' + (sum ? Math.round(w.w / sum * 100) : 0) + '%</b></span><input class="gi" type="number" min="0" max="200" value="' + (+G.pplay[w.id] || 0) + '" data-gnpl="' + w.id + '"></label>').join('') + '</div>';
  }

  function rulesHtml() {
    const A = D.animals, c = A.species.cow, v = A.verify;
    const row = (k, t) => '<div class="grule"><b>' + k + '</b><span>' + t + '</span></div>';
    return '<div class="ghow"><h4>' + T('Все правила генетики животных', 'Every rule of livestock genetics') + '</h4>'
      + row(T('Что в генах', 'What the genes are'), T('У зверя 5 генов (D навоз, L долголетие, Y молоко и шерсть, F плодовитость, H выносливость). У каждого по две копии: плохая ✕, обычная ● или хорошая ★. Видна лучшая копия (хорошая сильнее обычной, обычная сильнее плохой), вторая копия «скрыта» и может достаться потомку. В панели игры видны цветные круги: серый обычная, красный плохая, зелёный хорошая.', 'An animal has 5 genes (D dung, L longevity, Y milk and wool, F fertility, H hardiness). Each has two copies: bad ✕, ok ● or good ★. The best copy shows (good beats ok, ok beats bad); the other copy is carried and can go to the young. In the game panel the circles are grey for ok, red for bad and green for good.'))
      + row(T('Линия', 'Lineage'), T('Кроме генов у зверя два маркера линии (число от 0 до ' + (A.markers - 1) + '). Если оба маркера одинаковые, он инбредный: в игре под «Генетика» горит «INBRED».', 'Besides the genes an animal has two lineage markers (a number from 0 to ' + (A.markers - 1) + '). If both markers are equal it is inbred: the game shows "INBRED" under Genetics.'))
      + row(T('Что делает инбридинг', 'What inbreeding does'), T('Показатель гена делится пополам: хороший ген даёт ×1.0 вместо бонуса, обычный становится хуже обычного, плохой остаётся плохим (множитель инбридинга ' + A.inbredScale + ').', 'The trait of a gene is halved: a good gene gives ×1.0 instead of the bonus, an ok one becomes worse than ok, a bad one stays bad (inbreeding factor ' + A.inbredScale + ').'))
      + row(T('Как рождается детёныш', 'How the young is born'), T('По каждому гену детёныш получает одну случайную копию от матери и одну от отца (по 50%). Маркеры работают так же: по одному от каждого родителя. Если эти маркеры совпали, детёныш инбредный. Мутации ' + (A.mutation > 0 ? 'включены: ' + Math.round(A.mutation * 100) + '%' : 'на этом сервере выключены') + '.', 'For every gene the young gets one random copy from the mother and one from the father (50% each). Markers work the same: one from each parent. If those markers match, the young is inbred. Mutations are ' + (A.mutation > 0 ? 'on: ' + Math.round(A.mutation * 100) + '%' : 'off on this server') + '.'))
      + row(T('Дикие звери', 'Wild animals'), T('Каждая копия гена: ' + Math.round(A.goodChance * 100) + '% хорошая, ' + Math.round(A.badChance * 100) + '% плохая, остальное обычная. Маркеры случайные, поэтому у дикого шанс инбридинга 1 из ' + A.markers + '. Особый зверь: ' + num1(A.specialChance * 100, 1) + '%.', 'Every gene copy: ' + Math.round(A.goodChance * 100) + '% good, ' + Math.round(A.badChance * 100) + '% bad, the rest ok. Markers are random, so a wild animal has a 1 in ' + A.markers + ' chance of being inbred. A special animal: ' + num1(A.specialChance * 100, 1) + '%.'))
      + row(T('Множители генов', 'Gene multipliers'), A.genes.map((g) => T(GNAME[g][0], GNAME[g][1]) + ': ✕ ×' + A.mult[g].bad + ', ★ ×' + A.mult[g].good).join(' · ') + '. ' + T('Обычный всегда ×1.', 'Ok is always ×1.'))
      + row(T('Размножение', 'Breeding'), T('Нужны взрослые самец и самка рядом (до ' + A.breedRadius + ' м). Звери с состоянием ниже ' + Math.round(A.breedPause * 100) + '% перестают спариваться и возвращаются к этому, когда состояние выше ' + Math.round(A.breedResume * 100) + '%. Беременность ' + fmtSec(c.pregnancy) + ', пауза между спариваниями ' + fmtSec(A.breedCooldown) + ' делится на множитель плодовитости, в помёте до ' + A.litter + ' (больше за счёт плодовитости: лишнее = множитель минус 1, дробная часть это шанс).', 'A grown male and female must be close (up to ' + A.breedRadius + ' m). Animals with a condition below ' + Math.round(A.breedPause * 100) + '% stop mating and come back above ' + Math.round(A.breedResume * 100) + '%. Pregnancy lasts ' + fmtSec(c.pregnancy) + ', the pause between matings ' + fmtSec(A.breedCooldown) + ' is divided by the fertility multiplier, litters have up to ' + A.litter + ' (extras come from fertility: extra = multiplier minus 1, the fraction is the chance).'))
      + row(T('Рост и жизнь', 'Growth and life'), T('Детёныш растёт ' + fmtSec(c.grow) + ', взрослый живёт ' + fmtSec(c.lifespan) + ' × множитель долголетия (разброс ±' + Math.round(c.variance * 100) + '%).', 'The young grows for ' + fmtSec(c.grow) + ', an adult lives ' + fmtSec(c.lifespan) + ' × the longevity multiplier (spread ±' + Math.round(c.variance * 100) + '%).'))
      + row(T('Что дают', 'What they give'), T('Корова: ' + c.milkAmount + ' молока за дойку раз в ' + fmtSec(c.milkCooldown) + '. Овца: ' + (A.species.sheep && A.species.sheep.wool ? A.species.sheep.wool[0].amount : '?') + ' шерсти за стрижку раз в ' + fmtSec(A.species.sheep ? A.species.sheep.shearCooldown : 0) + '. Навоз раз в ' + fmtSec(c.dungInterval) + '. Количество умножается на множитель Y, пауза делится на него.', 'Cow: ' + c.milkAmount + ' milk per milking every ' + fmtSec(c.milkCooldown) + '. Sheep: ' + (A.species.sheep && A.species.sheep.wool ? A.species.sheep.wool[0].amount : '?') + ' wool per shearing every ' + fmtSec(A.species.sheep ? A.species.sheep.shearCooldown : 0) + '. Dung every ' + fmtSec(c.dungInterval) + '. The amount is multiplied by the Y multiplier, the pause is divided by it.'))
      + (v ? row(T('Проверка', 'Check'), T('Формулы сверены с настоящим кодом игры: ' + num1(v.samples, 0) + ' рождений, расхождение не больше ' + num1(v.maxDeviation * 100, 1) + '%.', 'The formulas were checked against the real game code: ' + num1(v.samples, 0) + ' births, deviation no more than ' + num1(v.maxDeviation * 100, 1) + '%.')) : '') + '</div>' + faqAnimals();
  }

  function animalsHtml() {
    if (!D.names) loadNames();
    const modes = [['herd', 'Мой скот', 'My herd'], ['pair', 'Подбор пары', 'Best pair'], ['plan', 'План до идеала', 'Way to perfect'], ['child', 'Потомок двух', 'The offspring'], ['one', 'Что даёт зверь', 'What an animal gives'], ['special', 'Особые', 'Special'], ['names', 'Имена', 'Names'], ['rules', 'Правила и вопросы', 'Rules and questions']];
    const chips = '<div class="fch">' + modes.map((m) => '<button class="fc' + (G.amode === m[0] ? ' on' : '') + '" data-gnam="' + m[0] + '">' + T(m[1], m[2]) + '</button>').join('') + '</div>';
    const legend = '<p class="mut">' + T('Нажимай значки ★ ● ✕: у каждого гена две копии. Круги сверху выглядят как панель «Генетика» в игре.', 'Click the ★ ● ✕ icons: every gene has two copies. The circles on top look like the Genetics panel of the game.') + '</p>';
    if (G.amode === 'special') return chips + specialHtml();
    if (G.amode === 'rules') return chips + rulesHtml();
    if (G.amode === 'names') return chips + namesHtml();
    if (G.amode === 'pair') return chips + pairHtml();
    if (G.amode === 'plan') return chips + planHtml();
    if (G.amode === 'herd') return chips + legend + herdHtml();
    if (G.amode === 'child') return chips + legend + childHtml();
    return chips + legend + oneHtml();
  }

  /* =====================================================  PAGE  ===================================================== */
  async function boot() {
    if ((D.raid && D.animals) || D.loading) return;
    D.loading = true;
    try {
      D.raid = await (await fetch('raid.json')).json();
      D.animals = await (await fetch('animals.json')).json();
    } catch (e) { D.failed = true; }
    D.loading = false;
    draw();
  }
  function draw() {
    const box = document.getElementById('gnBox');
    if (!box) return;
    if (D.failed) { box.innerHTML = '<p class="mut" style="text-align:center">' + T('Не удалось загрузить данные. Попробуй позже.', 'Could not load the data. Try again later.') + '</p>'; return; }
    if (!D.raid || !D.animals) { box.innerHTML = '<p class="mut" style="text-align:center">' + T('Загрузка…', 'Loading…') + '</p>'; return; }
    const tabs = document.getElementById('gnTabs');
    if (tabs) tabs.innerHTML = [['plants', '🌱 Растения', '🌱 Plants'], ['animals', '🐄 Животные', '🐄 Livestock']].map((t) => '<button class="fc' + (G.tab === t[0] ? ' on' : '') + '" data-gntab="' + t[0] + '">' + T(t[1], t[2]) + '</button>').join('');
    box.innerHTML = G.tab === 'plants' ? plantsHtml() : animalsHtml();
    refresh();
  }
  function refresh() {
    if (G.tab === 'plants') { if (G.pmode === 'plan') planRes(); else if (G.pmode === 'cross') crossRes(); else if (G.pmode === 'cond') condRes(); return; }
    if (G.amode === 'one') oneRes(); else if (G.amode === 'child') childRes(); else if (G.amode === 'pair') aPairRes(); else if (G.amode === 'herd') aHerdRes(); else if (G.amode === 'plan') aPlanRes();
  }
  window.geneticsHtml = function () {
    setTimeout(() => { boot(); draw(); }, 0);
    return '<section id="genetics"><div class="wrap">' + ttl(T('Генетика', 'Genetics')) + '<p class="note" style="margin:-14px 0 24px">' + T('Растения и животные: какой будет результат, как получить лучший и что он даёт. Все правила прочитаны из игры нашего сервера.', 'Plants and livestock: what you get, how to get the best and what it gives. Every rule was read from the game of our server.') + '</p><div class="fch" id="gnTabs"></div><div id="gnBox"></div></div></section>';
  };

  /* ---------- events ---------- */
  const who = (k) => (k === 'one' ? G.one : k === 'mom' ? G.mother : k === 'dad' ? G.father : G.draft);
  document.addEventListener('click', (e) => {
    let b;
    if ((b = e.target.closest('[data-gntab]'))) { G.tab = b.dataset.gntab; draw(); return; }
    if ((b = e.target.closest('[data-gnpm]'))) { G.pmode = b.dataset.gnpm; draw(); return; }
    if ((b = e.target.closest('[data-gnam]'))) { G.amode = b.dataset.gnam; draw(); return; }
    if ((b = e.target.closest('[data-gngoal]'))) { G.goal = b.dataset.gngoal; draw(); return; }
    if ((b = e.target.closest('[data-gncrop]'))) { G.crop = b.dataset.gncrop; draw(); return; }
    if ((b = e.target.closest('[data-gnlay]'))) { G.layout = b.dataset.gnlay; draw(); return; }
    if ((b = e.target.closest('[data-gnscan]'))) { SC.kind = b.dataset.gnscan === 'animal' ? 'animal' : 'plant'; SC.region = SC.regions[SC.kind] || null; SC.open = true; SC.reading = null; SC.last = ''; SC.stable = 0; SC.added = ''; scanDraw(); return; }
    if (e.target.closest('[data-gnscanclose]')) { scanStop(true); SC.open = false; scanDraw(); return; }
    if (e.target.closest('[data-gnscanshare]')) { scanShare(); return; }
    if (e.target.closest('[data-gnscanstop]')) { scanStop(); return; }
    if (e.target.closest('[data-gnscanadd]')) { const v = clean((scEl('gnScanFix') || {}).value); if (valid(v)) { SC.added = v; addScanned(v); } return; }
    if ((b = e.target.closest('[data-gntarget]'))) { G.target = b.dataset.gntarget; G.custom = ''; draw(); return; }
    if (e.target.closest('[data-gnadd]')) { addClone(); return; }
    if (e.target.closest('[data-gnexample]')) { G.inv[G.crop] = ['GGYYXX', 'GYGHWX', 'YYGGHH', 'GGGXWX', 'HYGYGX']; save(); draw(); return; }
    if (e.target.closest('[data-gnclear]')) { G.inv[G.crop] = []; save(); draw(); return; }
    if ((b = e.target.closest('[data-gnrm]'))) { const arr = G.inv[G.crop] || [], i = arr.indexOf(b.dataset.gnrm); if (i >= 0) arr.splice(i, 1); save(); draw(); return; }
    if ((b = e.target.closest('[data-gnal]'))) {
      const [w, i, k] = b.dataset.gnal.split(':'), an = who(w);
      an.g[+i][+k] = (an.g[+i][+k] + 1) % 3;
      const keep = window.scrollY; draw(); window.scrollTo(0, keep); return;
    }
    if (e.target.closest('[data-gnherdadd]')) {
      const d = G.draft, an = { sp: d.sp, sex: d.sex, name: d.name.trim().slice(0, 24), g: d.g.map((p) => p.slice()), m: d.m.slice() };
      if (G.editIdx >= 0 && G.herd[G.editIdx]) { G.herd[G.editIdx] = an; G.editIdx = -1; } else G.herd.push(an);
      G.draft.name = ''; save(); const keep = window.scrollY; draw(); window.scrollTo(0, keep); return;
    }
    if (e.target.closest('[data-gnherdcancel]')) { G.editIdx = -1; G.draft = blank(); draw(); return; }
    if ((b = e.target.closest('[data-gnherdedit]'))) { const a = G.herd[+b.dataset.gnherdedit]; if (a) { G.editIdx = +b.dataset.gnherdedit; G.draft = { sp: a.sp, sex: a.sex, name: a.name, g: a.g.map((p) => p.slice()), m: a.m.slice() }; draw(); window.scrollTo(0, document.getElementById('genetics').offsetTop); } return; }
    if ((b = e.target.closest('[data-gnherddel]'))) { G.herd.splice(+b.dataset.gnherddel, 1); if (G.sel >= G.herd.length) G.sel = -1; G.editIdx = -1; save(); draw(); return; }
    if ((b = e.target.closest('[data-gnherdpick]'))) { G.sel = +b.dataset.gnherdpick; G.amode = 'pair'; draw(); return; }
    if (e.target.closest('[data-gnherdclear]')) { if (!G.herd.length || confirm(T('Очистить всё стадо?', 'Clear the whole herd?'))) { G.herd = []; G.sel = -1; G.editIdx = -1; save(); draw(); } return; }
    if (e.target.closest('[data-gnexp]')) { const box = document.getElementById('gnPort'); if (box) { box.value = codeOf(G.herd); box.select(); } return; }
    if (e.target.closest('[data-gnimp]')) { const box = document.getElementById('gnPort'), list = box ? herdFrom(box.value) : null; if (!list || !list.length) { if (box) box.classList.add('bad'); return; } G.herd = G.herd.concat(list); save(); draw(); return; }
    if ((b = e.target.closest('[data-gnloc]'))) { G.nameLoc = b.dataset.gnloc; draw(); return; }
  });
  function addClone() {
    const inp = document.getElementById('gnAdd');
    if (!inp) return;
    const v = inp.value.toUpperCase().replace(/[^GYHWX]/g, '');
    if (!valid(v)) { inp.classList.add('bad'); return; }
    (G.inv[G.crop] = G.inv[G.crop] || []).push(v);
    save(); draw();
    const n = document.getElementById('gnAdd'); if (n) n.focus();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'gnAdd') { e.preventDefault(); addClone(); } });
  const refocus = (id) => { const keep = window.scrollY; draw(); window.scrollTo(0, keep); const el = document.getElementById(id); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } };
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'gnNameQ') { G.nameq = t.value; refocus('gnNameQ'); return; }
    if (t.id === 'gnDynQ') { G.dynq = t.value; refocus('gnDynQ'); return; }
    if (t.dataset && t.dataset.gnn !== undefined) { G.neigh[+t.dataset.gnn] = clean(t.value); t.value = G.neigh[+t.dataset.gnn]; crossRes(); }
    else if (t.dataset && t.dataset.gncond !== undefined) {
      const k = t.dataset.gncond;
      C[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' || t.type === 'number' ? +t.value : t.value;
      const lab = document.getElementById('gc_' + k);
      if (lab) lab.textContent = k === 'hour' ? hm(C.hour) : C[k] + (k === 'water' ? '%' : k === 'temp' ? '°C' : '');
      condRes();
    }
    else if (t.dataset && t.dataset.gnown !== undefined) { G.own = clean(t.value); t.value = G.own; crossRes(); }
    else if (t.id === 'gnCustom') { G.custom = t.value.toUpperCase().replace(/[^GYHWX]/g, ''); t.value = G.custom; planRes(); }
    else if (t.dataset && t.dataset.gnname) who(t.dataset.gnname).name = t.value;
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.gnpl !== undefined) { G.pplay[t.dataset.gnpl] = Math.max(0, +t.value || 0); const keep = window.scrollY; draw(); window.scrollTo(0, keep); return; }
    if (t.dataset && t.dataset.gnplan !== undefined) {
      const k = t.dataset.gnplan;
      if (k === 'sp') G.plan.sp = t.value; else if (k === 'k') G.plan.k = Math.max(1, Math.min(8, +t.value || 1)); else if (k[0] === 'g') G.plan.genes[+k.slice(1)] = t.checked;
      aPlanRes(); return;
    }
    if (t.dataset && t.dataset.gnscanfile !== undefined) { if (t.files && t.files[0]) scanImage(t.files[0]); }
    else if (t.dataset && t.dataset.gnscanauto !== undefined) SC.auto = t.checked;
    else if (t.dataset && t.dataset.gnscanmk !== undefined) { SC.markers = t.checked; scanDraw(); }
    else if (t.dataset && t.dataset.gnscandest !== undefined) SC.dest = t.value;
    else if (t.dataset && t.dataset.gnsp) { who(t.dataset.gnsp).sp = t.value; draw(); }
    else if (t.dataset && t.dataset.gnsex) { who(t.dataset.gnsex).sex = t.value; draw(); }
    else if (t.dataset && t.dataset.gnmk) { const [w, k] = t.dataset.gnmk.split(':'); who(w).m[+k] = +t.value; const keep = window.scrollY; draw(); window.scrollTo(0, keep); }
  });
})();
