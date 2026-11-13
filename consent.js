// Consent gate: the first visit shows the requirements (age, rules, cheat check, data). The answer is remembered in this browser.
// A decline is counted anonymously (no name, no IP) and shows up in the admin panel (tab "Сводка").
(() => {
  const VERSION = "v1";
  const KEY = "lima_consent";
  const API = (window.LIMA_API || "https://lima-rust-api.lima-backend.workers.dev").replace(/\/$/, "");
  if (window.top !== window.self) return;                                   // the admin panel preview
  if (/bot|crawl|spider|slurp|google|yandex|bing|lighthouse/i.test(navigator.userAgent) || navigator.webdriver) return;
  const query = new URLSearchParams(location.search);
  if (query.has("nogate")) return;

  let saved = "";
  try { saved = localStorage.getItem(KEY) || ""; } catch (e) { /* storage blocked: ask every time */ }
  if (saved === "agree:" + VERSION) return;

  const send = (choice) => { try { fetch(API + "/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice, v: VERSION }), keepalive: true }).catch(() => {}); } catch (e) { /* offline */ } };
  const remember = (value) => { try { localStorage.setItem(KEY, value + ":" + VERSION); } catch (e) { /* ignore */ } };

  const css = document.createElement("style");
  css.textContent = `#lcg{position:fixed;inset:0;z-index:99999;background:rgba(10,12,8,.94);display:flex;align-items:center;justify-content:center;padding:16px;font:16px/1.55 system-ui,Segoe UI,Roboto,sans-serif;color:#e8ebdd}
#lcg .b{max-width:560px;width:100%;max-height:92vh;overflow:auto;background:#1b1e15;border:1px solid #3a4128;border-radius:16px;padding:24px 24px 20px}
#lcg h2{margin:0 0 6px;font-size:22px;color:#d4e85a}
#lcg p{margin:8px 0}#lcg ul{padding-left:20px;margin:10px 0}#lcg li{margin:6px 0}
#lcg a{color:#d4e85a}
#lcg .r{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
#lcg button{font:700 15px inherit;font-family:inherit;border-radius:10px;padding:11px 18px;cursor:pointer;border:1px solid #4a5232;background:#262b1b;color:#e8ebdd}
#lcg button.ok{background:#d4e85a;color:#1a1d10;border-color:#d4e85a}
#lcg .m{color:#98a088;font-size:13px}`;
  document.head.appendChild(css);

  const box = document.createElement("div");
  box.id = "lcg";
  document.documentElement.style.overflow = "hidden";

  const ask = () => {
    box.innerHTML = `<div class="b" role="dialog" aria-modal="true" aria-labelledby="lcgT">
      <h2 id="lcgT">Прежде чем войти</h2>
      <p>Lima Rust это игровой сервер. Чтобы всем было честно и безопасно, мы просим подтвердить:</p>
      <ul>
        <li>Мне есть 18 лет, либо родитель или законный представитель знает об этом и согласен (<a href="for-parents.html" target="_blank" rel="noopener">страница для родителей</a>).</li>
        <li>Я принимаю <a href="terms.html" target="_blank" rel="noopener">условия использования</a> и правила сервера.</li>
        <li>Я согласен с проверкой на читы и с тем, что мои игровые данные обрабатываются по <a href="privacy.html" target="_blank" rel="noopener">политике конфиденциальности</a>.</li>
        <li>Покупки (когда их включат) идут по <a href="sales-terms.html" target="_blank" rel="noopener">условиям покупки</a>.</li>
      </ul>
      <div class="r"><button class="ok" id="lcgY">Согласен, продолжить</button><button id="lcgN">Не согласен</button></div>
      <p class="m">Ваш ответ запоминается в этом браузере. Если вы откажетесь, мы только учтём, что кто-то отказался: без имени и адреса.</p>
      <p class="m">English: by continuing you confirm you are 18+ (or a parent agrees), accept the terms, the cheat check and the privacy policy.</p></div>`;
    box.querySelector("#lcgY").onclick = () => { remember("agree"); send("agree"); box.remove(); document.documentElement.style.overflow = ""; };
    box.querySelector("#lcgN").onclick = () => { remember("decline"); send("decline"); declined(); };
    box.querySelector("#lcgY").focus();
  };

  const declined = () => {
    box.innerHTML = `<div class="b"><h2>Без согласия сайт не показывается</h2>
      <p>Понимаем. Условия нужны, чтобы играть честно и безопасно. Вы можете спокойно прочитать их и передумать.</p>
      <div class="r"><button class="ok" id="lcgBack">Я передумал, вернуться</button></div>
      <p><a href="terms.html" target="_blank" rel="noopener">Условия</a> · <a href="privacy.html" target="_blank" rel="noopener">Конфиденциальность</a> · <a href="for-parents.html" target="_blank" rel="noopener">Родителям</a></p></div>`;
    box.querySelector("#lcgBack").onclick = ask;
  };

  const show = () => { document.body.appendChild(box); saved === "decline:" + VERSION ? declined() : ask(); };
  if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
})();
