/* Genetics page: plants (cross result and a planting plan for a target) and livestock (child chances, best pair, special animals).
   The rules come from the game of our server: raid.json (plants) and animals.json (livestock), built by tools/site-data/build.mjs. */
(function () {
  'use strict';
  const T = (ru, en) => (LANG === 'en' ? en : ru);
  const D = { raid: null, animals: null, failed: false, loading: false };
  const G = {
    tab: 'plants', pmode: 'plan', amode: 'child', crop: 'red_berry', target: 'GGGYYY', custom: '', inv: {}, neigh: ['', '', '', '', '', '', '', ''],
    mother: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], father: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], herd: [], draft: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], dsex: 'F', dname: '',
  };
  try { G.inv = JSON.parse(localStorage.getItem('lima.gene.inv') || '{}'); G.herd = JSON.parse(localStorage.getItem('lima.gene.herd') || '[]'); } catch (e) { G.inv = {}; G.herd = []; }
  const save = () => { try { localStorage.setItem('lima.gene.inv', JSON.stringify(G.inv)); localStorage.setItem('lima.gene.herd', JSON.stringify(G.herd)); } catch (e) { /* private mode */ } };

  /* ---------- plants ---------- */
  const CROPS = [
    ['red_berry', 'Красные ягоды', 'Red berries'], ['blue_berry', 'Синие ягоды', 'Blue berries'], ['yellow_berry', 'Жёлтые ягоды', 'Yellow berries'], ['green_berry', 'Зелёные ягоды', 'Green berries'],
    ['white_berry', 'Белые ягоды', 'White berries'], ['black_berry', 'Чёрные ягоды', 'Black berries'], ['hemp', 'Конопля', 'Hemp'], ['potato', 'Картофель', 'Potato'], ['pumpkin', 'Тыква', 'Pumpkin'],
    ['corn', 'Кукуруза', 'Corn'], ['wheat', 'Пшеница', 'Wheat'], ['orchid', 'Орхидея', 'Orchid'], ['rose', 'Роза', 'Rose'], ['sunflower', 'Подсолнух', 'Sunflower'],
  ];
  const GENES = { G: ['Рост', 'Growth', 'Растение растёт быстрее.', 'The plant grows faster.'], Y: ['Урожай', 'Yield', 'Больше плодов при сборе.', 'More fruit when picked.'], H: ['Стойкость', 'Hardiness', 'Защита от холода и жары.', 'Protection from cold and heat.'], W: ['Вода', 'Water', 'Тратит больше воды.', 'Uses more water.'], X: ['Пусто', 'Empty', 'Бесполезная ячейка.', 'A useless slot.'] };
  const PRESETS = [['GGGYYY', 'Мета: баланс', 'Meta: balanced', 'Лучший выбор для ягод, ткани и еды.', 'The best choice for berries, cloth and food.'], ['GGGGYY', 'Турбо-рост', 'Turbo growth', 'Много сборов за короткое время.', 'Many harvests in a short time.'], ['YYYYGG', 'Макс. урожай', 'Max yield', 'Дольше растёт, зато больше за раз.', 'Slower, but more at once.'], ['HHHGGG', 'Выживальщик', 'Survivor', 'Для холодных биомов без отопления.', 'For cold biomes without heating.']];
  const WEIGHT = () => {
    const w = (D.raid.plants[0] || { weights: [1, 1, 0.6, 0.6, 0.6] }).weights;
    return { X: w[0], W: w[1], G: w[2], Y: w[3], H: w[4] };
  };
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

  // the best set of up to eight neighbours for a target: depth first search with a node budget
  function bestNeighbours(pool, target) {
    const types = pool.map((p) => ({ code: p.code, max: Math.min(8, p.n) }));
    types.sort((a, b) => [...b.code].filter((c, i) => c === target[i]).length - [...a.code].filter((c, i) => c === target[i]).length);
    const U = types.slice(0, 12);
    let best = null, nodes = 0;
    const cur = [];
    const score = (res) => {
      let m = 0, good = 0;
      for (let i = 0; i < 6; i++) { if (res[i] === target[i]) m++; if ('GYH'.includes(res[i])) good++; }
      return m * 100 + good * 2;
    };
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
      if (!b.result.includes('?')) counts[b.result] = 8; // a finished plant gives as many clones as needed
      else break;
    }
    return steps;
  }

  const gridHtml = (picks, result, target) => {
    const order = [0, 1, 2, 3, null, 4, 5, 6, 7];
    return '<div class="ggrid">' + order.map((p) => (p === null ? '<div class="gcell gc"><small>' + T('результат', 'result') + '</small>' + (result ? letters(result, target) : '?') + '</div>' : '<div class="gcell">' + (picks && picks[p] ? letters(picks[p], target) : '<span class="mut">·</span>') + '</div>')).join('') + '</div>';
  };

  const CROP_EMOJI = { red_berry: '🍓', blue_berry: '🫐', yellow_berry: '🍋', green_berry: '🍏', white_berry: '🤍', black_berry: '🖤', hemp: '🌿', potato: '🥔', pumpkin: '🎃', corn: '🌽', wheat: '🌾', orchid: '🌺', rose: '🌹', sunflower: '🌻' };
  const cropIcon = (id) => '<em class="ce">' + (CROP_EMOJI[id] || '🌱') + '</em>';

  function plantsHtml() {
    const modes = [['plan', 'Подбор схемы под цель', 'Planting plan for a target'], ['cross', 'Что получится при скрещивании', 'What crossbreeding gives']];
    const chips = '<div class="fch">' + modes.map((m) => '<button class="fc' + (G.pmode === m[0] ? ' on' : '') + '" data-gnpm="' + m[0] + '">' + T(m[1], m[2]) + '</button>').join('') + '</div>';
    return chips + (G.pmode === 'plan' ? planForm() : crossForm());
  }

  function crossForm() {
    return '<p class="mut">' + T('Впиши гены соседних растений вокруг грядки (до 8, по 6 букв). Соседи должны быть уже взрослыми. Посередине появится результат.', 'Type the genes of the plants around the planter (up to 8, six letters each). They must already be mature. The result shows in the middle.') + '</p><div class="gx"><div class="ggrid ginput">' + [0, 1, 2, 3, null, 4, 5, 6, 7].map((p) => (p === null ? '<div class="gcell gc" id="gxRes"></div>' : '<input class="gi" maxlength="6" placeholder="GYGHYG" data-gnn="' + p + '" value="' + esc(G.neigh[p]) + '">')).join('') + '</div><div id="gxInfo"></div></div>';
  }
  function crossRes() {
    const list = G.neigh.map((g) => g.toUpperCase().replace(/[^GYHWX]/g, '')).filter(valid);
    const box = document.getElementById('gxRes'), info = document.getElementById('gxInfo');
    if (!box || !info) return;
    if (list.length < 2) { box.innerHTML = '<small>' + T('нужно 2+ растения', 'need 2+ plants') + '</small>'; info.innerHTML = ''; return; }
    const r = cross(list), good = [...r.code].filter((c) => 'GYH'.includes(c)).length;
    box.innerHTML = '<small>' + T('результат', 'result') + '</small>' + letters(r.code);
    info.innerHTML = '<div class="tnote">' + T('Полезных генов', 'Good genes') + ': <b>' + good + '/6</b>' + (r.code.includes('?') ? ' · ' + T('«?» значит равные веса, итог решает игра', '"?" means equal weights, the game decides') : '') + '</div><div class="ttab">' + r.slots.map((s, i) => '<div class="trow gsl"><div class="tn"><b>' + T('Ячейка', 'Slot') + ' ' + (i + 1) + '</b></div><div class="tx">' + Object.entries(s.sum).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<b class="gl g' + k + '">' + k + '</b> ' + v.toFixed(1)).join('  ') + '</div><div class="tx"><b>' + s.win.join(' / ') + '</b></div></div>').join('') + '</div>' + howHtml();
  }
  const howHtml = () => '<div class="ghow"><h4>' + T('Как это работает', 'How it works') + '</h4><p class="mut">' + T('Когда растение в центре грядки становится саженцем, оно смотрит на гены соседей, которые уже выросли. В каждой ячейке складываются веса генов, побеждает самый тяжёлый. Зелёные G, Y, H весят 0.6, красные W и X весят 1. Чтобы зелёный ген победил красный, нужно минимум два зелёных против одного красного.', 'When the plant in the middle of the planter becomes a sapling, it looks at the genes of the grown plants around it. In every slot the weights are added and the heaviest wins. Green G, Y, H weigh 0.6, red W and X weigh 1. A green gene needs at least two greens against one red.') + '</p><div class="gkey">' + Object.entries(GENES).map(([k, v]) => '<div><b class="gl g' + k + '">' + k + '</b> <b>' + T(v[0], v[1]) + '</b><small>' + T(v[2], v[3]) + '</small></div>').join('') + '</div></div>';

  function planForm() {
    const inv = G.inv[G.crop] || [];
    const counts = {};
    inv.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
    return '<div class="gcrops">' + CROPS.map((c) => '<button class="gcrop' + (G.crop === c[0] ? ' on' : '') + '" data-gncrop="' + c[0] + '">' + cropIcon(c[0]) + '<span>' + T(c[1], c[2]) + '</span></button>').join('') + '</div>'
      + '<h4 class="tlist">' + T('1. Твои клоны (' + T('для выбранной культуры', 'for the chosen crop') + ')', '1. Your clones (for the chosen crop)') + '</h4><div class="tq"><input class="gi" id="gnAdd" maxlength="6" placeholder="GGYYXX" autocomplete="off"><button class="btn pri" data-gnadd>' + T('Добавить', 'Add') + '</button><button class="btn" data-gnexample>' + T('Пример', 'Example') + '</button><button class="btn" data-gnclear>' + T('Очистить', 'Clear') + '</button></div><div class="gchips">'
      + (Object.keys(counts).length ? Object.entries(counts).map(([c, n]) => '<span class="gchip">' + letters(c) + '<i>×' + n + '</i><button data-gnrm="' + c + '" aria-label="' + T('убрать', 'remove') + '">−</button></span>').join('') : '<span class="mut">' + T('Пока пусто: впиши 6 букв и нажми Enter.', 'Empty so far: type six letters and press Enter.') + '</span>') + '</div>'
      + '<h4 class="tlist">' + T('2. Какой ген хочешь', '2. The gene you want') + '</h4><div class="gpre">' + PRESETS.map((p) => '<button class="gp' + (G.target === p[0] && !G.custom ? ' on' : '') + '" data-gntarget="' + p[0] + '"><span>' + letters(p[0]) + '</span><b>' + T(p[1], p[2]) + '</b><small>' + T(p[3], p[4]) + '</small></button>').join('') + '</div><div class="tq" style="margin-top:10px"><label class="mut">' + T('или свой', 'or your own') + '</label><input class="gi" id="gnCustom" maxlength="6" placeholder="GGGYYY" value="' + esc(G.custom) + '"></div>'
      + '<h4 class="tlist">' + T('3. Схема посадки', '3. Planting plan') + '</h4><div id="gnPlan"></div>' + howHtml();
  }
  function planRes() {
    const box = document.getElementById('gnPlan');
    if (!box) return;
    const target = (G.custom && valid(G.custom.toUpperCase()) ? G.custom.toUpperCase() : G.target);
    const inv = G.inv[G.crop] || [];
    if (inv.length < 2) { box.innerHTML = '<div class="tnote">' + T('Добавь хотя бы два клона, и схема появится здесь.', 'Add at least two clones and the plan appears here.') + '</div>'; return; }
    const steps = planFor(inv, target);
    if (!steps.length) { box.innerHTML = '<div class="tnote bad">' + T('Не получилось собрать схему.', 'Could not build a plan.') + '</div>'; return; }
    const last = steps[steps.length - 1], done = last.matches === 6;
    box.innerHTML = '<div class="tnote' + (done ? '' : ' bad') + '">' + (done ? '✅ ' + T('Цель достигнута за ' + steps.length + ' шаг(ов).', 'The target is reached in ' + steps.length + ' step(s).') : T('Лучшее, что выходит из твоих клонов: совпало ' + last.matches + ' из 6. Добавь клонов с нужными генами.', 'The best your clones give: ' + last.matches + ' of 6 match. Add clones with the genes you need.')) + '</div><div class="gsteps">' + steps.map((s, i) => '<div class="card gstep"><h4>' + T('Шаг', 'Step') + ' ' + (i + 1) + '</h4>' + gridHtml(s.picks, s.result, target) + '<p class="mut">' + T('Посади вокруг грядки: ', 'Plant around the planter: ') + Object.entries(s.used).map(([c, n]) => '<span class="gchip">' + letters(c) + '<i>×' + n + '</i></span>').join(' ') + '</p><p>' + T('Получится', 'Result') + ': ' + letters(s.result, target) + ' <small class="mut">(' + s.matches + '/6)</small></p>' + (i < steps.length - 1 ? '<p class="mut">' + T('Возьми клоны получившегося растения и используй их на следующем шаге.', 'Take clones of the new plant and use them in the next step.') + '</p>' : '') + '</div>').join('') + '</div>';
  }

  /* ---------- livestock ---------- */
  const AL = ['B', 'O', 'G'], ALN = [['Плохой', 'Bad'], ['Обычный', 'Ok'], ['Хороший', 'Good']], ASYM = ['✕', '●', '★'];
  const GNAME = { Dung: ['Навоз', 'Dung'], Longevity: ['Долголетие', 'Longevity'], Yield: ['Молоко и шерсть', 'Milk and wool'], Fertility: ['Плодовитость', 'Fertility'], Hardiness: ['Выносливость', 'Hardiness'] };
  const GDESC = { Dung: ['сколько навоза даёт', 'how much dung it gives'], Longevity: ['сколько живёт', 'how long it lives'], Yield: ['выход молока и шерсти', 'milk and wool yield'], Fertility: ['как часто и много приплода', 'how often and how many young'], Hardiness: ['здоровье и устойчивость', 'health and resilience'] };

  function dist(pair) { const d = [0, 0, 0]; pair.forEach((a) => (d[a] += 0.5)); return d; }
  function childGene(m, f) {
    const pm = dist(m), pf = dist(f), out = { exp: [0, 0, 0], pair: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] };
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) { const p = pm[x] * pf[y]; out.exp[Math.max(x, y)] += p; out.pair[x][y] += p; }
    out.good = pm[2] * pf[2];
    return out;
  }
  function mult(gene, level) { const m = D.animals.mult[gene]; return level === 2 ? m.good : level === 0 ? m.bad : 1; }
  function childReport(mom, dad) {
    const A = D.animals;
    const per = A.genes.map((g, i) => { const c = childGene(mom[i], dad[i]); return { g, c, exp: c.exp[2] * mult(g, 2) + c.exp[1] + c.exp[0] * mult(g, 0) }; });
    const avg = per.reduce((s, x) => s + x.exp, 0) / per.length;
    const allGood = per.reduce((s, x) => s * x.c.exp[2], 1), god = per.reduce((s, x) => s * x.c.good, 1);
    return { per, avg, allGood, god };
  }
  const pct = (p) => (p * 100 < 10 && p > 0 ? (p * 100).toFixed(1) : Math.round(p * 100)) + '%';

  function toggle(who, i, k, v) { return '<button class="al a' + AL[v] + '" data-gnal="' + who + ':' + i + ':' + k + '" title="' + T(ALN[v][0], ALN[v][1]) + '">' + ASYM[v] + '</button>'; }
  function editor(who, arr) {
    const A = D.animals;
    return '<div class="ged">' + A.genes.map((g, i) => '<div class="grow"><span><b>' + T(GNAME[g][0], GNAME[g][1]) + '</b><small>' + T(GDESC[g][0], GDESC[g][1]) + '</small></span><span class="gpair">' + toggle(who, i, 0, arr[i][0]) + toggle(who, i, 1, arr[i][1]) + '</span><span class="gshow ' + 'a' + AL[Math.max(arr[i][0], arr[i][1])] + '" title="' + T('что видно у животного', 'what the animal shows') + '">' + ASYM[Math.max(arr[i][0], arr[i][1])] + '</span></div>').join('') + '</div>';
  }

  function animalsHtml() {
    const modes = [['child', 'Какой будет потомок', 'The offspring'], ['pair', 'Подобрать пару из стада', 'Best pair of the herd'], ['special', 'Особые животные', 'Special animals']];
    const chips = '<div class="fch">' + modes.map((m) => '<button class="fc' + (G.amode === m[0] ? ' on' : '') + '" data-gnam="' + m[0] + '">' + T(m[1], m[2]) + '</button>').join('') + '</div>';
    const A = D.animals;
    const legend = '<p class="mut">' + T('У каждого гена две копии. Нажимай на значки: ★ хороший, ● обычный, ✕ плохой. Видна лучшая копия (хороший перекрывает обычный, обычный плохой), а вторая копия передаётся потомкам как «скрытая».', 'Every gene has two copies. Click the icons: ★ good, ● ok, ✕ bad. The best copy shows (good beats ok, ok beats bad); the other copy is carried and can be passed on.') + '</p>';
    if (G.amode === 'special') return chips + specialHtml();
    if (G.amode === 'pair') {
      return chips + legend + '<div class="gpairform"><div><h4 class="tlist">' + T('Добавить животное в стадо', 'Add an animal to the herd') + '</h4><div class="tq" style="margin-bottom:10px"><select id="gnSex"><option value="F"' + (G.dsex === 'F' ? ' selected' : '') + '>♀ ' + T('самка', 'female') + '</option><option value="M"' + (G.dsex === 'M' ? ' selected' : '') + '>♂ ' + T('самец', 'male') + '</option></select><input id="gnName" maxlength="20" placeholder="' + T('кличка (по желанию)', 'name (optional)') + '" value="' + esc(G.dname) + '"></div>' + editor('d', G.draft) + '<div class="tq" style="margin-top:12px"><button class="btn pri" data-gnherdadd>' + T('Добавить в стадо', 'Add to herd') + '</button></div></div><div><h4 class="tlist">' + T('Твоё стадо', 'Your herd') + '</h4><div id="gnHerd"></div></div></div><div id="gnPairs"></div>';
    }
    return chips + legend + '<div class="gparents"><div><h4 class="tlist">♀ ' + T('Мать', 'Mother') + '</h4>' + editor('m', G.mother) + '</div><div><h4 class="tlist">♂ ' + T('Отец', 'Father') + '</h4>' + editor('f', G.father) + '</div></div><div id="gnChild"></div>'
      + '<div class="tnote">' + T('Новые дикие животные: ' + Math.round(A.goodChance * 100) + '% хороших копий, ' + Math.round(A.badChance * 100) + '% плохих, остальные обычные. Мутации ' + (A.mutation > 0 ? 'включены: ' + Math.round(A.mutation * 100) + '%' : 'на сервере выключены') + '. В помёте до ' + A.litter + '.', 'New wild animals: ' + Math.round(A.goodChance * 100) + '% good copies, ' + Math.round(A.badChance * 100) + '% bad, the rest ok. Mutations are ' + (A.mutation > 0 ? 'on: ' + Math.round(A.mutation * 100) + '%' : 'off on this server') + '. Up to ' + A.litter + ' young in a litter.') + '</div>';
  }
  function childRes() {
    const box = document.getElementById('gnChild');
    if (!box) return;
    const r = childReport(G.mother, G.father), A = D.animals;
    box.innerHTML = '<div class="tgrid4"><div class="tc best"><b>×' + r.avg.toFixed(2) + '</b><small>' + T('в среднем по всем генам', 'average over all genes') + '</small></div><div class="tc"><b>' + pct(r.allGood) + '</b><small>' + T('все 5 генов хорошие', 'all 5 genes good') + '</small></div><div class="tc"><b>' + pct(r.god) + '</b><small>' + T('идеал: все 10 копий хорошие', 'perfect: all 10 copies good') + '</small></div></div><div class="ttab">' + r.per.map((x) => '<div class="trow"><div class="tn"><b>' + T(GNAME[x.g][0], GNAME[x.g][1]) + '</b></div><div class="tx gbar" style="grid-column:span 2"><div class="gb"><i class="aG" style="width:' + x.c.exp[2] * 100 + '%"></i><i class="aO" style="width:' + x.c.exp[1] * 100 + '%"></i><i class="aB" style="width:' + x.c.exp[0] * 100 + '%"></i></div><small>★ ' + pct(x.c.exp[2]) + ' · ● ' + pct(x.c.exp[1]) + ' · ✕ ' + pct(x.c.exp[0]) + '</small></div><div class="tx"><b>×' + x.exp.toFixed(2) + '</b><small>' + T('ожидаемый показатель', 'expected value') + '</small></div></div>').join('') + '</div><p class="mut tfoot">' + T('Каждый родитель передаёт одну из двух своих копий гена наугад. Хорошие множители игры: ' + A.genes.map((g) => T(GNAME[g][0], GNAME[g][1]) + ' ×' + A.mult[g].good).join(', ') + '.', 'Each parent passes one of its two gene copies at random. Good multipliers of the game: ' + A.genes.map((g) => T(GNAME[g][0], GNAME[g][1]) + ' ×' + A.mult[g].good).join(', ') + '.') + '</p>';
  }

  function herdRes() {
    const list = document.getElementById('gnHerd'), pairs = document.getElementById('gnPairs');
    if (!list || !pairs) return;
    list.innerHTML = G.herd.length ? G.herd.map((a, i) => '<div class="gh"><b>' + (a.sex === 'F' ? '♀' : '♂') + ' ' + esc(a.name || T('без клички', 'no name')) + '</b><span class="gcode">' + a.genes.map((p) => ASYM[p[0]] + ASYM[p[1]]).join(' ') + '</span><button class="fc" data-gnherddel="' + i + '" aria-label="' + T('убрать', 'remove') + '">✕</button></div>').join('') : '<p class="mut">' + T('Пока пусто.', 'Empty so far.') + '</p>';
    const fem = G.herd.filter((a) => a.sex === 'F'), mal = G.herd.filter((a) => a.sex === 'M');
    if (!fem.length || !mal.length) { pairs.innerHTML = '<div class="tnote">' + T('Нужны самка и самец, и здесь появится рейтинг пар.', 'Add a female and a male and the ranking of pairs appears here.') + '</div>'; return; }
    const rows = [];
    fem.forEach((f) => mal.forEach((m) => { const r = childReport(f.genes, m.genes); rows.push({ f, m, r }); }));
    rows.sort((p, q) => q.r.avg - p.r.avg || q.r.god - p.r.god);
    pairs.innerHTML = '<h4 class="tlist">' + T('Лучшие пары', 'Best pairs') + '</h4><div class="ttab">' + rows.slice(0, 8).map((x, i) => '<div class="trow' + (i === 0 ? ' best' : '') + '"><div class="tn"><b>♀ ' + esc(x.f.name || '?') + ' + ♂ ' + esc(x.m.name || '?') + '</b>' + (i === 0 ? '<span class="ub new">' + T('лучшая', 'best') + '</span>' : '') + '</div><div class="tx"><b>×' + x.r.avg.toFixed(2) + '</b><small>' + T('в среднем', 'average') + '</small></div><div class="tx"><b>' + pct(x.r.allGood) + '</b><small>' + T('все гены хорошие', 'all genes good') + '</small></div><div class="tx"><b>' + pct(x.r.god) + '</b><small>' + T('идеал', 'perfect') + '</small></div></div>').join('') + '</div>';
  }

  function specialHtml() {
    const A = D.animals;
    const sx = (s) => (s === 'Female' ? '♀' : '♂');
    const by = Object.fromEntries(A.specials.map((s) => [s.name, s]));
    return '<p class="mut">' + T('Особые животные встречаются редко (шанс ' + (A.specialChance * 100).toFixed(1) + '% у новых животных). Если скрестить двух особых, появится потомок с новым названием.', 'Special animals are rare (' + (A.specialChance * 100).toFixed(1) + '% chance for new animals). Crossing two special ones gives an offspring with a new name.') + '</p><div class="gspec">' + A.specials.map((s) => '<span class="gchip">' + sx(s.sex) + ' <b>' + esc(s.name) + '</b>' + (s.bad ? ' <i title="' + T('может иметь плохие гены', 'may have bad genes') + '">⚠</i>' : '') + '</span>').join('') + '</div><h4 class="tlist">' + T('Что с чем скрещивать', 'What to cross with what') + '</h4><div class="ttab">' + A.crosses.map((c) => '<div class="trow gcr"><div class="tn"><b>' + (by[c.a] ? sx(by[c.a].sex) : '') + ' ' + esc(c.a) + '</b><span class="mut">+</span><b>' + (by[c.b] ? sx(by[c.b].sex) : '') + ' ' + esc(c.b) + '</b></div><div class="tx" style="grid-column:span 3"><b>→ ' + esc(c.child) + '</b></div></div>').join('') + '</div>';
  }

  /* ---------- page ---------- */
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
    if (G.amode === 'child') childRes(); else if (G.amode === 'pair') herdRes();
  }

  window.geneticsHtml = function () {
    setTimeout(() => { boot(); draw(); }, 0);
    return '<section id="genetics"><div class="wrap">' + ttl(T('Генетика', 'Genetics')) + '<p class="note" style="margin:-14px 0 24px">' + T('Растения и животные: какой будет результат и как получить лучший. Правила взяты из игры нашего сервера.', 'Plants and livestock: what you get and how to get the best. The rules come from the game of our server.') + '</p><div class="fch" id="gnTabs"></div><div id="gnBox"></div></div></section>';
  };

  /* ---------- events ---------- */
  const cycle = (v) => (v + 1) % 3;
  document.addEventListener('click', (e) => {
    let b;
    if ((b = e.target.closest('[data-gntab]'))) { G.tab = b.dataset.gntab; draw(); return; }
    if ((b = e.target.closest('[data-gnpm]'))) { G.pmode = b.dataset.gnpm; draw(); return; }
    if ((b = e.target.closest('[data-gnam]'))) { G.amode = b.dataset.gnam; draw(); return; }
    if ((b = e.target.closest('[data-gncrop]'))) { G.crop = b.dataset.gncrop; draw(); return; }
    if ((b = e.target.closest('[data-gntarget]'))) { G.target = b.dataset.gntarget; G.custom = ''; draw(); return; }
    if (e.target.closest('[data-gnadd]')) { addClone(); return; }
    if (e.target.closest('[data-gnexample]')) { G.inv[G.crop] = ['GGYYXX', 'GYGHWX', 'YYGGHH', 'GGGXWX', 'HYGYGX']; save(); draw(); return; }
    if (e.target.closest('[data-gnclear]')) { G.inv[G.crop] = []; save(); draw(); return; }
    if ((b = e.target.closest('[data-gnrm]'))) { const arr = G.inv[G.crop] || [], i = arr.indexOf(b.dataset.gnrm); if (i >= 0) arr.splice(i, 1); save(); draw(); return; }
    if ((b = e.target.closest('[data-gnal]'))) {
      const [who, i, k] = b.dataset.gnal.split(':'), arr = who === 'm' ? G.mother : who === 'f' ? G.father : G.draft;
      arr[+i][+k] = cycle(arr[+i][+k]);
      const keep = window.scrollY; draw(); window.scrollTo(0, keep); return;
    }
    if (e.target.closest('[data-gnherdadd]')) { G.herd.push({ sex: G.dsex, name: G.dname.trim(), genes: G.draft.map((p) => p.slice()) }); G.dname = ''; save(); draw(); return; }
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
    else if (t.id === 'gnName') G.dname = t.value;
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'gnSex') G.dsex = e.target.value; });
})();
