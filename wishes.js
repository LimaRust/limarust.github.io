/* Wishes page: a form for ideas and a list of what the team accepted. */
(function () {
  'use strict';
  const T = (ru, en) => (LANG === 'en' ? en : ru);
  const KINDS = [
    ['server', '🎮', 'Сервер и геймплей', 'Server and gameplay'], ['site', '🌐', 'Сайт', 'Website'], ['kit', '🎁', 'Киты и магазин', 'Kits and shop'],
    ['event', '🎉', 'Ивенты', 'Events'], ['bug', '🐞', 'Ошибка', 'Bug'], ['other', '💬', 'Другое', 'Other'],
  ];
  const ST = { accepted: ['Принято, делаем', 'Accepted, in progress'], done: ['Готово', 'Done'] };
  const W = { list: null, sent: false, busy: false, msg: '', kind: 'server' };

  async function loadList() {
    if (W.list) return;
    try { W.list = await api('/api/wishes'); } catch (e) { W.list = []; }
    draw();
  }

  function listHtml() {
    if (!W.list || !W.list.length) return '<p class="mut">' + T('Здесь появятся пожелания, которые мы приняли или уже сделали.', 'Wishes we accepted or finished will appear here.') + '</p>';
    const date = (s) => new Date(s * 1000).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' });
    return '<div class="wlist">' + W.list.map((w) => {
      const k = KINDS.find((x) => x[0] === w.kind) || KINDS[5];
      return '<div class="card wl ' + w.status + '"><span class="ub ' + (w.status === 'done' ? '' : 'new') + '">' + T(ST[w.status][0], ST[w.status][1]) + '</span><p>' + esc(w.text) + '</p><span class="mut">' + k[1] + ' ' + T(k[2], k[3]) + ' · ' + date(w.created) + '</span></div>';
    }).join('') + '</div>';
  }

  function formHtml() {
    if (W.sent) return '<div class="card wdone"><h3>' + T('Спасибо! Пожелание отправлено', 'Thank you! Your wish was sent') + '</h3><p class="mut">' + T('Мы прочитаем его и рассмотрим. Если идея подойдёт, она появится в списке ниже.', 'We will read it and consider it. If the idea fits, it will show up in the list below.') + '</p><button class="btn pri" data-wagain>' + T('Отправить ещё', 'Send another') + '</button></div>';
    return '<form class="card wf" id="wForm" autocomplete="off"><div class="wrow"><label>' + T('О чём пожелание', 'What is it about') + '<select name="kind">' + KINDS.map((k) => '<option value="' + k[0] + '"' + (k[0] === W.kind ? ' selected' : '') + '>' + k[1] + ' ' + T(k[2], k[3]) + '</option>').join('') + '</select></label></div>'
      + '<label>' + T('Что хочешь предложить', 'What would you like to suggest') + '<textarea name="text" rows="6" maxlength="1500" required minlength="10" placeholder="' + T('Опиши идею своими словами: что добавить, изменить или починить', 'Describe the idea in your own words: what to add, change or fix') + '"></textarea></label>'
      + '<div class="wrow two"><label>' + T('Как к тебе обращаться (по желанию)', 'Your name (optional)') + '<input name="name" maxlength="40" value="' + esc(typeof ACC !== 'undefined' && ACC ? ACC.nick : '') + '"></label><label>' + T('Discord или Telegram для связи (по желанию)', 'Discord or Telegram to reach you (optional)') + '<input name="contact" maxlength="60"></label></div>'
      + '<input type="text" name="hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">'
      + '<div class="wfoot"><span class="mut wmsg" id="wMsg">' + esc(W.msg) + '</span><button class="btn pri" type="submit"' + (W.busy ? ' disabled' : '') + '>' + (W.busy ? T('Отправляем…', 'Sending…') : T('Отправить пожелание', 'Send the wish')) + '</button></div></form>';
  }

  function draw() {
    const box = document.getElementById('wBox');
    if (box) box.innerHTML = '<div class="wcols"><div>' + formHtml() + '</div><div><h3 class="grp" style="margin-top:0">' + T('Что мы уже приняли', 'What we accepted') + '</h3>' + listHtml() + '</div></div>';
  }

  window.wishesHtml = function () {
    setTimeout(() => { loadList(); draw(); }, 0);
    return '<section id="wishes"><div class="wrap">' + ttl(T('Пожелания', 'Wishes')) + '<p class="note" style="margin:-14px 0 24px">' + T('Подай свою идею: мы читаем каждое пожелание и рассматриваем его. Принятые идеи появляются рядом.', 'Send your idea: we read every wish and consider it. Accepted ideas show up next to the form.') + '</p><div id="wBox"></div></div></section>';
  };

  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'wForm') return;
    e.preventDefault();
    const f = new FormData(e.target);
    W.kind = f.get('kind');
    const text = String(f.get('text') || '').trim();
    if (text.length < 10) { document.getElementById('wMsg').textContent = T('Напиши хотя бы пару предложений (от 10 символов).', 'Write at least a couple of sentences (10+ characters).'); return; }
    W.busy = true; W.msg = ''; draw();
    try {
      await api('/api/wish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: W.kind, text, name: f.get('name'), contact: f.get('contact'), hp: f.get('hp') }) });
      W.sent = true;
    } catch (err) {
      W.msg = String(err.message) === 'http_429' ? T('Слишком часто. Попробуй через час.', 'Too often. Try again in an hour.') : T('Не удалось отправить. Попробуй позже.', 'Could not send. Try again later.');
    }
    W.busy = false; draw();
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-wagain]')) { W.sent = false; W.msg = ''; draw(); } });
})();
