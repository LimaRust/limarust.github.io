// Support chat for visitors without Discord. An AI helper answers first; when it cannot help, a human administrator takes over in Discord
// and the answer shows up here. The chat is kept in this browser by a random token (no account, no e-mail, no IP is stored).
(() => {
  if (window.top !== window.self) return;                                   // the admin panel preview
  const API = (window.LIMA_API || "https://lima-rust-api.lima-backend.workers.dev").replace(/\/$/, "");
  const KEY = "lima_support";
  const EN = /^en/i.test(document.documentElement.lang || "") || (window.LANG === "en") || /[?&]lang=en/.test(location.search);
  const T = EN ? {
    open: "Support", title: "Support", hello: "Hello! Ask any question about the server. A helper (AI) answers first; if it cannot help, a real administrator joins this chat.",
    ph: "Write your question…", send: "Send", close: "Close chat", wait: "An administrator has been called. Please keep this page open.", slow: "Too fast, wait a bit.", busy: "Support is busy, try later.", err: "No connection, try again.",
    callBtn: "Call an administrator", ai: "Helper (AI)", staff: "Administrator", full: "Full screen / back", min: "Minimize", you: "You", ended: "The chat is closed. Write a message to start a new one.", priv: "Messages are kept 90 days after the chat is closed. Do not send passwords.",
  } : {
    open: "Поддержка", title: "Поддержка", hello: "Здравствуйте! Задайте любой вопрос про сервер. Сначала отвечает помощник (ИИ), если он не справится, в чат придёт живой администратор.",
    ph: "Напишите вопрос…", send: "Отправить", close: "Закрыть чат", wait: "Администратор вызван. Не закрывайте эту страницу.", slow: "Слишком быстро, подождите немного.", busy: "Поддержка сейчас занята, попробуйте позже.", err: "Нет связи, попробуйте ещё раз.",
    callBtn: "Позвать администратора", ai: "Помощник (ИИ)", staff: "Администратор", full: "На весь экран / обратно", min: "Свернуть", you: "Вы", ended: "Чат закрыт. Напишите сообщение, чтобы начать новый.", priv: "Сообщения хранятся 90 дней после закрытия чата. Не отправляйте пароли.",
  };

  let token = "", after = 0, status = "none", timer = null, opened = false;
  try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); token = s.token || ""; after = s.after || 0; } catch (e) { /* storage blocked */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ token, after })); } catch (e) { /* ignore */ } };

  const css = document.createElement("style");
  css.textContent = `#lsb{position:fixed;left:16px;bottom:16px;z-index:9000;background:#d4e85a;color:#1a1d10;border:0;border-radius:999px;padding:11px 18px;font:700 15px system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.4)}
#lsp{position:fixed;left:16px;bottom:16px;z-index:9001;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 32px));display:none;flex-direction:column;background:#1b1e15;color:#e8ebdd;border:1px solid #3a4128;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.55);font:15px/1.45 system-ui,Segoe UI,sans-serif;overflow:hidden}
#lsp header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#262b1b;font-weight:700;color:#d4e85a}
#lsp header button{background:none;border:0;color:#98a088;font-size:20px;cursor:pointer;padding:0 6px}
#lsp header .hb{display:flex;gap:4px;align-items:center}
#lsp.big{left:0;bottom:0;width:100vw;height:100vh;height:100dvh;max-width:none;border-radius:0;border:0}
#lsp.big #lsm .m{max-width:min(720px,86%)}
#lsm{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
#lsm .m{max-width:86%;padding:8px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}
#lsm .u{align-self:flex-end;background:#d4e85a;color:#1a1d10}
#lsm .a{align-self:flex-start;background:#2c3123}
#lsm .s{align-self:flex-start;background:#1f3a4d;border:1px solid #56ccf2}
#lsm .n{align-self:center;color:#98a088;font-size:13px;text-align:center}
#lsm small{display:block;color:#98a088;font-size:11px;margin-bottom:2px}
#lsm .u small{color:#4a5232}
#lsp .callrow{padding:6px 10px 0}#lsp .callrow button{width:100%;background:#262b1b;color:#d4e85a;border:1px solid #3a4128;border-radius:10px;padding:8px;font:inherit;font-weight:700;cursor:pointer}#lsp .callrow button:hover{background:#2f3622}
#lsf{display:flex;gap:8px;padding:10px;border-top:1px solid #2c3123}
#lsf textarea{flex:1;resize:none;height:44px;background:#12140f;color:#e8ebdd;border:1px solid #3a4128;border-radius:10px;padding:8px 10px;font:inherit}
#lsf button{background:#d4e85a;color:#1a1d10;border:0;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer}
#lsf button:disabled{opacity:.5;cursor:default}
#lsp .foot{padding:0 12px 8px;color:#98a088;font-size:11px;display:flex;justify-content:space-between;gap:8px}
#lsp .foot a{color:#98a088;cursor:pointer;text-decoration:underline}`;
  document.head.appendChild(css);

  const btn = document.createElement("button"); btn.id = "lsb"; btn.type = "button"; btn.textContent = "💬 " + T.open;
  const panel = document.createElement("div"); panel.id = "lsp"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", T.title);
  panel.innerHTML = `<header><span>💬 ${T.title}</span><span class="hb"><button type="button" id="lse" aria-label="expand" title="${T.full}">⛶</button><button type="button" id="lsx" aria-label="close" title="${T.min}">×</button></span></header><div id="lsm"></div>
    <div class="callrow"><button type="button" id="lsa">👤 ${T.callBtn}</button></div>
    <div id="lsf"><textarea id="lst" maxlength="1000" placeholder="${T.ph}"></textarea><button type="button" id="lss">${T.send}</button></div>
    <div class="foot"><span>${T.priv}</span><a id="lsc">${T.close}</a></div>`;
  document.body.appendChild(btn); document.body.appendChild(panel);
  const box = panel.querySelector("#lsm"), input = panel.querySelector("#lst"), sendBtn = panel.querySelector("#lss");

  const note = (text) => { const d = document.createElement("div"); d.className = "m n"; d.textContent = text; box.appendChild(d); box.scrollTop = box.scrollHeight; };
  const add = (m) => {
    const d = document.createElement("div");
    const isStaff = String(m.who).indexOf("staff") === 0, staffName = isStaff ? String(m.who).slice(6) : "";
    d.className = "m " + (m.who === "user" ? "u" : isStaff ? "s" : "a");
    const s = document.createElement("small"); s.textContent = m.who === "user" ? T.you : isStaff ? (T.staff + (staffName ? " " + staffName : "")) : T.ai;
    const t = document.createElement("span"); t.textContent = m.text;            // text only: nothing from the server is ever run as HTML
    d.appendChild(s); d.appendChild(t); box.appendChild(d); box.scrollTop = box.scrollHeight;
    after = Math.max(after, m.id || 0);
  };
  const take = (list) => { (list || []).forEach((m) => { if (m.id > after) add(m); }); save(); };

  const api = async (path, init) => { const r = await fetch(API + path, init); return { code: r.status, body: await r.json().catch(() => ({})) }; };

  async function poll() {
    if (!token) return;
    try {
      const r = await api("/api/support/poll?token=" + encodeURIComponent(token) + "&after=" + after);
      take(r.body.messages);
      if (r.body.status === "closed" && status !== "closed") note(T.ended);
      status = r.body.status || status;
      if (status === "closed") { token = ""; after = 0; save(); }
    } catch (e) { /* offline: try again later */ }
  }

  async function send(call) {
    const text = call === true ? "" : input.value.trim();
    if ((!text && call !== true) || sendBtn.disabled) return;
    sendBtn.disabled = true;
    try {
      const r = await api("/api/support/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, text, call: call === true, after, lang: EN ? "en" : "ru" }) });
      if (r.code === 429) note(r.body.error === "busy" ? T.busy : T.slow);
      else if (r.body.ok) { input.value = ""; if (r.body.token !== token) { token = r.body.token; after = 0; } take(r.body.messages); status = r.body.status; if (status === "staff") note(T.wait); }
      else note(T.err);
    } catch (e) { note(T.err); }
    sendBtn.disabled = false; input.focus();
  }

  const show = () => {
    opened = true; panel.style.display = "flex"; btn.style.display = "none";
    if (!box.childElementCount) { note(T.hello); if (token) { after = 0; poll(); } }
    clearInterval(timer); timer = setInterval(poll, 7000); input.focus();
  };
  const hide = () => { opened = false; panel.style.display = "none"; btn.style.display = ""; clearInterval(timer); };
  const setBig = (on) => { panel.classList.toggle("big", on); try { localStorage.setItem(KEY + "_big", on ? "1" : ""); } catch (e) { /* ignore */ } };
  try { if (localStorage.getItem(KEY + "_big")) panel.classList.add("big"); } catch (e) { /* ignore */ }

  btn.onclick = show;
  panel.querySelector("#lsx").onclick = hide;
  panel.querySelector("#lse").onclick = () => setBig(!panel.classList.contains("big"));
  panel.querySelector("#lsc").onclick = async () => { if (token) { try { await api("/api/support/close", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }); } catch (e) { /* ignore */ } } token = ""; after = 0; status = "none"; save(); box.innerHTML = ""; note(T.hello); };
  sendBtn.onclick = () => send();
  panel.querySelector("#lsa").onclick = () => send(true);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && opened) hide(); });
})();
