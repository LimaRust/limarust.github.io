/* Genetics page: plants (planting plan, cross result, what a clone gives) and livestock (the in-game genome panel, child chances, best pair).
   Every rule here was read from the game code of our server and checked against it (tools/site-data, plugins LimaWikiRaid and LimaWikiAnimals). */
(function () {
  'use strict';
  const T = (ru, en) => (LANG === 'en' ? en : ru);
  const D = { raid: null, animals: null, failed: false, loading: false };
  const blank = () => ({ sp: 'cow', sex: 'F', name: '', g: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], m: [0, 1] });
  const G = {
    tab: 'plants', pmode: 'plan', amode: 'one', crop: 'red_berry', target: 'GGGYYY', custom: '', inv: {}, neigh: ['', '', '', '', '', '', '', ''],
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
  const cropIcon = (id) => '<em class="ce">' + (CROP_EMOJI[id] || '🌱') + '</em>';
  const GENES = { G: ['Рост', 'Growth', 'Быстрее растёт: +25% к скорости за каждый ген.', 'Grows faster: +25% speed for every gene.'], Y: ['Урожай', 'Yield', 'Больше плодов (+25% за ген) и больше клонов (каждые два гена дают +1).', 'More fruit (+25% per gene) and more clones (every two genes give +1).'], H: ['Стойкость', 'Hardiness', 'Лучше переносит холод и жару (+5% к климату и +20% к почве за ген).', 'Handles cold and heat better (+5% climate and +20% ground per gene).'], W: ['Вода', 'Water', 'Тратит больше воды: +10% за каждый ген.', 'Uses more water: +10% for every gene.'], X: ['Пусто', 'Empty', 'Ничего не даёт.', 'Does nothing.'] };
  const PRESETS = [['GGGYYY', 'Мета: баланс', 'Meta: balanced', 'Лучший выбор для ягод, ткани и еды.', 'The best choice for berries, cloth and food.'], ['GGGGYY', 'Турбо-рост', 'Turbo growth', 'Много сборов за короткое время.', 'Many harvests in a short time.'], ['YYYYGG', 'Макс. урожай', 'Max yield', 'Дольше растёт, зато больше за раз.', 'Slower, but more at once.'], ['HHHGGG', 'Выживальщик', 'Survivor', 'Для холодных биомов без отопления.', 'For cold biomes without heating.']];
  const plant = () => (D.raid.plants.find((p) => p.id === G.crop) || D.raid.plants[0]);
  const WEIGHT = () => { const w = plant().weights; return { X: w[0], W: w[1], G: w[2], Y: w[3], H: w[4] }; };
  const valid = (s) => /^[GYHWX]{6}$/.test(s);
  const letters = (code, target) => [...code].map((c, i) => '<b class="gl g' + c + (target && target[i] === c ? ' hit' : '') + '">' + c + '</b>').join('');

  function cross(list) {
    const w = WEIGHT(), slots = [];
    let code = '';
    for (let i = 0; i < 6; i++) {
      const sum = {};
      list.forEach((g) => (sum[g[i]] = (sum[g[i]] || 0) + w[g[i]]));
      const max = Math.max(...Object.values(sum)), win = Object.keys(sum).filter((k) => Math.abs(sum[k] - max) < 1e-9);
      code += win.length > 1 ? '?' : win[0];
      slots.push({ sum, win });
    }
    return { code, slots };
  }

  // what a clone does: every number is the rule of the game code, the crop gives the base values
  function effectsOf(code) {
    const c = { G: 0, Y: 0, H: 0, W: 0, X: 0 };
    [...code].forEach((x) => { if (c[x] !== undefined) c[x]++; });
    const P = plant(), E = P.entity || {}, pr = P.props || {};
    const gs = E.growthGeneSpeedMultiplier ?? 0.25, ws = E.waterGeneRequirementMultiplier ?? 0.1, ys = E.yieldGeneBonusMultiplier ?? 0.25, hg = E.hardinessGeneModifierBonus ?? 0.2, ht = E.hardinessGeneTemperatureModifierBonus ?? 0.05;
    const speed = 1 + c.G * gs, secs = (P.stages || []).slice(0, 6).reduce((s, x) => s + (x.seconds || 0), 0);
    const ripeStage = (P.stages || [])[5];
    const pos = c.G + c.Y + c.H, neg = c.W + c.X;
    return {
      counts: c, speed, ripe: secs / speed, water: 1 + c.W * ws, yieldMul: 1 + c.Y * ys, clones: (pr.BaseCloneCount ?? 2) + Math.floor(c.Y / 2), temp: c.H * ht, ground: c.H * hg,
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

  // the best set of up to eight neighbours for a target: depth first search with a node budget
  function bestNeighbours(pool, target) {
    const types = pool.map((p) => ({ code: p.code, max: Math.min(8, p.n) }));
    types.sort((a, b) => [...b.code].filter((c, i) => c === target[i]).length - [...a.code].filter((c, i) => c === target[i]).length);
    const U = types.slice(0, 12);
    let best = null, nodes = 0;
    const cur = [];
    const score = (res) => { let m = 0, good = 0; for (let i = 0; i < 6; i++) { if (res[i] === target[i]) m++; if ('GYH'.includes(res[i])) good++; } return m * 100 + good * 2; };
    const dfs = (i, left) => {
      if (nodes++ > 250000) return;
      if (i === U.length) {
        if (!cur.length) return;
        const r = cross(cur).code, s = score(r) - cur.length * 0.01;
        if (!best || s > best.s) best = { s, result: r, picks: cur.slice() };
        return;
      }
      for (let n = Math.min(left, U[i].max); n >= 0; n--) {
        for (let k = 0; k < n; k++) cur.push(U[i].code);
        dfs(i + 1, left - n);
        cur.length -= n;
      }
    };
    dfs(0, 8);
    return best;
  }
  function planFor(codes, target) {
    const counts = {};
    codes.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    const steps = [];
    let lastScore = -1;
    for (let step = 0; step < 8; step++) {
      const pool = Object.entries(counts).map(([code, n]) => ({ code, n }));
      const b = bestNeighbours(pool, target);
      if (!b) break;
      const matches = [...b.result].filter((c, i) => c === target[i]).length;
      if (step > 0 && b.s <= lastScore) break;
      lastScore = b.s;
      const used = {};
      b.picks.forEach((c) => (used[c] = (used[c] || 0) + 1));
      steps.push({ picks: b.picks, result: b.result, matches, used });
      if (matches === 6) break;
      if (!b.result.includes('?')) counts[b.result] = 8; else break;
    }
    return steps;
  }
  const gridHtml = (picks, result, target) => {
    const order = [0, 1, 2, 3, null, 4, 5, 6, 7];
    return '<div class="ggrid">' + order.map((p) => (p === null ? '<div class="gcell gc"><small>' + T('результат', 'result') + '</small>' + (result ? letters(result, target) : '?') + '</div>' : '<div class="gcell">' + (picks && picks[p] ? letters(picks[p], target) : '<span class="mut">·</span>') + '</div>')).join('') + '</div>';
  };

  const stageHtml = () => {
    const P = plant(), names = [['Семя', 'Seed'], ['Рассада', 'Seedling'], ['Саженец (можно брать клон)', 'Sapling (clones can be taken)'], ['Скрещивание', 'Crossbreeding'], ['Взросление', 'Mature'], ['Плодоношение', 'Fruiting'], ['Спелость (собирай)', 'Ripe (harvest)'], ['Умирание', 'Dying']];
    return '<div class="ghow"><h4>' + T('Стадии растения', 'Plant stages') + ' · ' + T((CROPS.find((c) => c[0] === G.crop) || CROPS[0])[1], (CROPS.find((c) => c[0] === G.crop) || CROPS[0])[2]) + '</h4><div class="gstages">' + (P.stages || []).map((s, i) => '<div class="gstg"><b>' + (i + 1) + '</b><span>' + T(names[i][0], names[i][1]) + '</span><small>' + fmtSec(s.seconds) + '</small></div>').join('') + '</div><p class="mut">' + T('Времена даны без генов роста: каждый ген G ускоряет рост на 25%. Скрещивание происходит, когда растение дорастает до стадии скрещивания: оно смотрит на гены взрослых соседей вокруг.', 'Times are without growth genes: every G gene speeds growth by 25%. Crossbreeding happens when the plant reaches the crossbreeding stage: it looks at the genes of the grown plants around it.') + '</p></div>';
  };
  const howHtml = () => '<div class="ghow"><h4>' + T('Как работает скрещивание', 'How crossbreeding works') + '</h4><p class="mut">' + T('В каждой из 6 ячеек складываются веса генов соседей, побеждает самый тяжёлый. Зелёные G, Y, H весят 0.6, красные W и X весят 1. Поэтому, чтобы зелёный ген победил красный, нужно минимум два зелёных против одного красного. Равные суммы дают случайный исход.', 'In each of the 6 slots the weights of the neighbours are added and the heaviest wins. Green G, Y, H weigh 0.6, red W and X weigh 1, so a green gene needs at least two greens against one red. Equal sums give a random result.') + '</p><div class="gkey">' + Object.entries(GENES).map(([k, v]) => '<div><b class="gl g' + k + '">' + k + '</b> <b>' + T(v[0], v[1]) + '</b><small>' + T(v[2], v[3]) + '</small></div>').join('') + '</div></div>';

  function plantsHtml() {
    const modes = [['plan', 'Подбор схемы под цель', 'Planting plan for a target'], ['cross', 'Что получится при скрещивании', 'What crossbreeding gives']];
    return '<div class="fch">' + modes.map((m) => '<button class="fc' + (G.pmode === m[0] ? ' on' : '') + '" data-gnpm="' + m[0] + '">' + T(m[1], m[2]) + '</button>').join('') + '</div>' + (G.pmode === 'plan' ? planForm() : crossForm());
  }
  function crossForm() {
    return '<p class="mut">' + T('Впиши гены соседних растений вокруг грядки (до 8, по 6 букв). Соседи должны быть уже взрослыми. Посередине появится результат.', 'Type the genes of the plants around the planter (up to 8, six letters each). They must already be mature. The result shows in the middle.') + '</p><div class="gx"><div class="ggrid ginput">' + [0, 1, 2, 3, null, 4, 5, 6, 7].map((p) => (p === null ? '<div class="gcell gc" id="gxRes"></div>' : '<input class="gi" maxlength="6" placeholder="GYGHYG" data-gnn="' + p + '" value="' + esc(G.neigh[p]) + '">')).join('') + '</div><div id="gxInfo"></div></div>' + stageHtml() + howHtml();
  }
  function crossRes() {
    const list = G.neigh.map((g) => g.toUpperCase().replace(/[^GYHWX]/g, '')).filter(valid);
    const box = document.getElementById('gxRes'), info = document.getElementById('gxInfo');
    if (!box || !info) return;
    if (list.length < 2) { box.innerHTML = '<small>' + T('нужно 2+ растения', 'need 2+ plants') + '</small>'; info.innerHTML = ''; return; }
    const r = cross(list), good = [...r.code].filter((c) => 'GYH'.includes(c)).length;
    box.innerHTML = '<small>' + T('результат', 'result') + '</small>' + letters(r.code);
    info.innerHTML = '<div class="tnote">' + T('Полезных генов', 'Good genes') + ': <b>' + good + '/6</b>' + (r.code.includes('?') ? ' · ' + T('«?» значит равные веса, итог решает игра', '"?" means equal weights, the game decides') : '') + '</div>' + (valid(r.code) ? effectsHtml(r.code) : '') + '<div class="ttab">' + r.slots.map((s, i) => '<div class="trow gsl"><div class="tn"><b>' + T('Ячейка', 'Slot') + ' ' + (i + 1) + '</b></div><div class="tx">' + Object.entries(s.sum).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<b class="gl g' + k + '">' + k + '</b> ' + v.toFixed(1)).join('  ') + '</div><div class="tx"><b>' + s.win.join(' / ') + '</b></div></div>').join('') + '</div>';
  }
  function planForm() {
    const inv = G.inv[G.crop] || [], counts = {};
    inv.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    return '<div class="gcrops">' + CROPS.map((c) => '<button class="gcrop' + (G.crop === c[0] ? ' on' : '') + '" data-gncrop="' + c[0] + '">' + cropIcon(c[0]) + '<span>' + T(c[1], c[2]) + '</span></button>').join('') + '</div>'
      + '<h4 class="tlist">' + T('1. Твои клоны для выбранной культуры', '1. Your clones for the chosen crop') + '</h4><div class="tq"><input class="gi" id="gnAdd" maxlength="6" placeholder="GGYYXX" autocomplete="off"><button class="btn pri" data-gnadd>' + T('Добавить', 'Add') + '</button><button class="btn" data-gnexample>' + T('Пример', 'Example') + '</button><button class="btn" data-gnclear>' + T('Очистить', 'Clear') + '</button></div><div class="gchips">'
      + (Object.keys(counts).length ? Object.entries(counts).map(([c, n]) => '<span class="gchip">' + letters(c) + '<i>×' + n + '</i><button data-gnrm="' + c + '" aria-label="' + T('убрать', 'remove') + '">−</button></span>').join('') : '<span class="mut">' + T('Пока пусто: впиши 6 букв и нажми Enter.', 'Empty so far: type six letters and press Enter.') + '</span>') + '</div>'
      + '<h4 class="tlist">' + T('2. Какой ген хочешь', '2. The gene you want') + '</h4><div class="gpre">' + PRESETS.map((p) => '<button class="gp' + (G.target === p[0] && !G.custom ? ' on' : '') + '" data-gntarget="' + p[0] + '"><span>' + letters(p[0]) + '</span><b>' + T(p[1], p[2]) + '</b><small>' + T(p[3], p[4]) + '</small></button>').join('') + '</div><div class="tq" style="margin-top:10px"><label class="mut">' + T('или свой', 'or your own') + '</label><input class="gi" id="gnCustom" maxlength="6" placeholder="GGGYYY" value="' + esc(G.custom) + '"></div>'
      + '<h4 class="tlist">' + T('3. Схема посадки', '3. Planting plan') + '</h4><div id="gnPlan"></div>' + stageHtml() + howHtml();
  }
  function planRes() {
    const box = document.getElementById('gnPlan');
    if (!box) return;
    const target = G.custom && valid(G.custom.toUpperCase()) ? G.custom.toUpperCase() : G.target, inv = G.inv[G.crop] || [];
    if (inv.length < 2) { box.innerHTML = '<div class="tnote">' + T('Добавь хотя бы два клона, и схема появится здесь.', 'Add at least two clones and the plan appears here.') + '</div>'; return; }
    const steps = planFor(inv, target);
    if (!steps.length) { box.innerHTML = '<div class="tnote bad">' + T('Не получилось собрать схему.', 'Could not build a plan.') + '</div>'; return; }
    const last = steps[steps.length - 1], done = last.matches === 6;
    box.innerHTML = '<div class="tnote' + (done ? '' : ' bad') + '">' + (done ? '✅ ' + T('Цель достигнута за ' + steps.length + ' шаг(ов).', 'The target is reached in ' + steps.length + ' step(s).') : T('Лучшее, что выходит из твоих клонов: совпало ' + last.matches + ' из 6. Добавь клонов с нужными генами.', 'The best your clones give: ' + last.matches + ' of 6 match. Add clones with the genes you need.')) + '</div><div class="gsteps">' + steps.map((s, i) => '<div class="card gstep"><h4>' + T('Шаг', 'Step') + ' ' + (i + 1) + '</h4>' + gridHtml(s.picks, s.result, target) + '<p class="mut">' + T('Посади вокруг грядки: ', 'Plant around the planter: ') + Object.entries(s.used).map(([c, n]) => '<span class="gchip">' + letters(c) + '<i>×' + n + '</i></span>').join(' ') + '</p><p>' + T('Получится', 'Result') + ': ' + letters(s.result, target) + ' <small class="mut">(' + s.matches + '/6)</small></p>' + (i < steps.length - 1 ? '<p class="mut">' + T('Возьми клоны получившегося растения и используй их на следующем шаге.', 'Take clones of the new plant and use them in the next step.') + '</p>' : '') + '</div>').join('') + '</div>' + (valid(last.result) ? effectsHtml(last.result, T('Итоговый клон', 'The final clone')) : '');
  }

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
    return (withMeta ? '<div class="tq" style="margin-bottom:10px"><select data-gnsp="' + who + '">' + Object.keys(SPN).map((k) => '<option value="' + k + '"' + (an.sp === k ? ' selected' : '') + '>' + SPN[k][2] + ' ' + T(SPN[k][0], SPN[k][1]) + '</option>').join('') + '</select><select data-gnsex="' + who + '"><option value="F"' + (an.sex === 'F' ? ' selected' : '') + '>♀ ' + T('самка', 'female') + '</option><option value="M"' + (an.sex === 'M' ? ' selected' : '') + '>♂ ' + T('самец', 'male') + '</option></select><input data-gnname="' + who + '" maxlength="20" placeholder="' + T('кличка (по желанию)', 'name (optional)') + '" value="' + esc(an.name) + '"></div>' : '')
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
      + '<h4 class="tlist">' + T('Ожидаемые показатели детёныша', 'Expected stats of the young') + '</h4>' + effectsTable(G.mother.sp, r.S, r.eff);
  }
  const pct = (p) => (p > 0 && p * 100 < 10 ? (p * 100).toFixed(1) : Math.round(p * 100)) + '%';

  /* ----- herd ----- */
  const GOALS = [['all', 'Всё сразу', 'Everything'], ['yield', 'Молоко / шерсть', 'Milk / wool'], ['fert', 'Приплод', 'Offspring'], ['life', 'Долголетие', 'Lifespan'], ['dung', 'Навоз', 'Dung']];
  const goalScore = (r) => (G.goal === 'yield' ? r.S[2] : G.goal === 'fert' ? r.S[3] : G.goal === 'life' ? r.S[1] : G.goal === 'dung' ? r.S[0] : r.avg);
  function herdHtml() {
    return '<div class="gpairform"><div><h4 class="tlist">' + T('Добавить зверя в стадо', 'Add an animal to the herd') + '</h4>' + editor('draft', G.draft, true) + '<div class="tq" style="margin-top:12px"><button class="btn pri" data-gnherdadd>' + T('Добавить в стадо', 'Add to herd') + '</button></div></div><div><h4 class="tlist">' + T('Твоё стадо', 'Your herd') + '</h4><div id="gnHerd"></div><div class="fch" style="margin-top:12px">' + GOALS.map((g) => '<button class="fc' + (G.goal === g[0] ? ' on' : '') + '" data-gngoal="' + g[0] + '">' + T(g[1], g[2]) + '</button>').join('') + '</div></div></div><div id="gnPairs"></div>';
  }
  function herdRes() {
    const list = document.getElementById('gnHerd'), pairs = document.getElementById('gnPairs');
    if (!list || !pairs) return;
    list.innerHTML = G.herd.length ? G.herd.map((a, i) => '<div class="gh">' + SPN[a.sp][2] + ' <b>' + (a.sex === 'F' ? '♀' : '♂') + ' ' + esc(a.name || T('без клички', 'no name')) + '</b><span class="apd sm">' + [0, 1, 2, 3, 4].map((k) => disc(a, k)).join('') + mdisc(a.m[0]) + mdisc(a.m[1]) + '</span><button class="fc" data-gnherddel="' + i + '" aria-label="' + T('убрать', 'remove') + '">✕</button></div>').join('') : '<p class="mut">' + T('Пока пусто.', 'Empty so far.') + '</p>';
    const rows = [];
    G.herd.filter((a) => a.sex === 'F').forEach((f) => G.herd.filter((m) => m.sex === 'M' && m.sp === f.sp).forEach((m) => rows.push({ f, m, r: childReport(f, m, f.sp) })));
    if (!rows.length) { pairs.innerHTML = '<div class="tnote">' + T('Нужны самка и самец одного вида, и здесь появится рейтинг пар.', 'Add a female and a male of the same species and the ranking of pairs appears here.') + '</div>'; return; }
    rows.sort((p, q) => goalScore(q.r) - goalScore(p.r) || q.r.god - p.r.god);
    pairs.innerHTML = '<h4 class="tlist">' + T('Лучшие пары', 'Best pairs') + '</h4><div class="ttab">' + rows.slice(0, 8).map((x, i) => '<div class="trow' + (i === 0 ? ' best' : '') + '"><div class="tn"><b>♀ ' + esc(x.f.name || '?') + ' + ♂ ' + esc(x.m.name || '?') + '</b>' + (i === 0 ? '<span class="ub new">' + T('лучшая', 'best') + '</span>' : '') + (x.r.pInbred > 0 ? '<span class="ub">⚠ ' + T('риск инбридинга ', 'inbred risk ') + Math.round(x.r.pInbred * 100) + '%</span>' : '') + '</div><div class="tx"><b>×' + num1(goalScore(x.r), 2) + '</b><small>' + T('по цели', 'for the goal') + '</small></div><div class="tx"><b>×' + num1(x.r.avg, 2) + '</b><small>' + T('в среднем', 'average') + '</small></div><div class="tx"><b>' + pct(x.r.god) + '</b><small>' + T('идеал', 'perfect') + '</small></div></div>').join('') + '</div>';
  }

  /* ----- special animals and the rules ----- */
  function specialHtml() {
    const A = D.animals, sx = (s) => (s === 'Female' ? '♀' : '♂'), by = Object.fromEntries(A.specials.map((s) => [s.name, s]));
    return '<p class="mut">' + T('Особые животные встречаются редко: шанс ' + num1(A.specialChance * 100, 1) + '% у нового дикого животного. Если скрестить двух особых, появится потомок с новым названием.', 'Special animals are rare: ' + num1(A.specialChance * 100, 1) + '% for a new wild animal. Crossing two special ones gives an offspring with a new name.') + '</p><div class="gspec">' + A.specials.map((s) => '<span class="gchip">' + sx(s.sex) + ' <b>' + esc(s.name) + '</b>' + (s.bad ? ' <i title="' + T('может иметь плохие гены', 'may have bad genes') + '">⚠</i>' : '') + '</span>').join('') + '</div><h4 class="tlist">' + T('Что с чем скрещивать', 'What to cross with what') + '</h4><div class="ttab">' + A.crosses.map((c) => '<div class="trow gcr"><div class="tn"><b>' + (by[c.a] ? sx(by[c.a].sex) : '') + ' ' + esc(c.a) + '</b><span class="mut">+</span><b>' + (by[c.b] ? sx(by[c.b].sex) : '') + ' ' + esc(c.b) + '</b></div><div class="tx" style="grid-column:span 3"><b>→ ' + esc(c.child) + '</b></div></div>').join('') + '</div>';
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
      + (v ? row(T('Проверка', 'Check'), T('Формулы сверены с настоящим кодом игры: ' + num1(v.samples, 0) + ' рождений, расхождение не больше ' + num1(v.maxDeviation * 100, 1) + '%.', 'The formulas were checked against the real game code: ' + num1(v.samples, 0) + ' births, deviation no more than ' + num1(v.maxDeviation * 100, 1) + '%.')) : '') + '</div>';
  }

  function animalsHtml() {
    const modes = [['one', 'Мой зверь', 'My animal'], ['child', 'Какой будет потомок', 'The offspring'], ['pair', 'Подобрать пару из стада', 'Best pair of the herd'], ['special', 'Особые животные', 'Special animals'], ['rules', 'Все правила', 'All the rules']];
    const chips = '<div class="fch">' + modes.map((m) => '<button class="fc' + (G.amode === m[0] ? ' on' : '') + '" data-gnam="' + m[0] + '">' + T(m[1], m[2]) + '</button>').join('') + '</div>';
    const legend = '<p class="mut">' + T('Нажимай значки ★ ● ✕: у каждого гена две копии. Круги сверху выглядят как панель «Генетика» в игре.', 'Click the ★ ● ✕ icons: every gene has two copies. The circles on top look like the Genetics panel of the game.') + '</p>';
    if (G.amode === 'special') return chips + specialHtml();
    if (G.amode === 'rules') return chips + rulesHtml();
    if (G.amode === 'pair') return chips + legend + herdHtml();
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
    if (G.tab === 'plants') { if (G.pmode === 'plan') planRes(); else crossRes(); return; }
    if (G.amode === 'one') oneRes(); else if (G.amode === 'child') childRes(); else if (G.amode === 'pair') herdRes();
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
    if (e.target.closest('[data-gnherdadd]')) { const d = G.draft; G.herd.push({ sp: d.sp, sex: d.sex, name: d.name.trim(), g: d.g.map((p) => p.slice()), m: d.m.slice() }); G.draft.name = ''; save(); draw(); return; }
    if ((b = e.target.closest('[data-gnherddel]'))) { G.herd.splice(+b.dataset.gnherddel, 1); save(); herdRes(); return; }
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
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.gnn !== undefined) { G.neigh[+t.dataset.gnn] = t.value.toUpperCase().replace(/[^GYHWX]/g, ''); t.value = G.neigh[+t.dataset.gnn]; crossRes(); }
    else if (t.id === 'gnCustom') { G.custom = t.value.toUpperCase().replace(/[^GYHWX]/g, ''); t.value = G.custom; planRes(); }
    else if (t.dataset && t.dataset.gnname) who(t.dataset.gnname).name = t.value;
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.gnsp) { who(t.dataset.gnsp).sp = t.value; draw(); }
    else if (t.dataset && t.dataset.gnsex) { who(t.dataset.gnsex).sex = t.value; draw(); }
    else if (t.dataset && t.dataset.gnmk) { const [w, k] = t.dataset.gnmk.split(':'); who(w).m[+k] = +t.value; const keep = window.scrollY; draw(); window.scrollTo(0, keep); }
  });
})();
