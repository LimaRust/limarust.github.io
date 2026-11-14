// Personal promo link: limarust.github.io/?code=NAME shows the code on top of the page and tells where to enter it.
(() => {
  if (window.top !== window.self) return;
  let code = "";
  try { code = (new URLSearchParams(location.search).get("code") || new URLSearchParams(location.search).get("promo") || "").trim(); } catch (e) { /* ignore */ }
  if (/^[A-Za-z0-9_-]{2,30}$/.test(code)) { try { sessionStorage.setItem("lima_promo", code); } catch (e) { /* ignore */ } }
  else { try { code = sessionStorage.getItem("lima_promo") || ""; } catch (e) { code = ""; } if (!/^[A-Za-z0-9_-]{2,30}$/.test(code)) return; }
  const API = (window.LIMA_API || "https://lima-rust-api.lima-backend.workers.dev").replace(/\/$/, "");
  try { if (new URLSearchParams(location.search).get("code") && !sessionStorage.getItem("lima_promo_sent")) { sessionStorage.setItem("lima_promo_sent", "1"); fetch(API + "/api/promo-visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), keepalive: true }).catch(() => {}); } } catch (e) { /* ignore */ }
  const show = () => {
    if (document.getElementById("lpb")) return;
    const bar = document.createElement("div"); bar.id = "lpb"; bar.setAttribute("role", "status");
    bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9500;background:#d4e85a;color:#1a1d10;font:600 15px system-ui,sans-serif;padding:9px 14px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap";
    bar.innerHTML = '🎁 Ваш промокод: <b style="font-size:17px;letter-spacing:1px"></b> <span>В игре напишите <b>/code</b> и введите его.</span>';
    bar.querySelector("b").textContent = code;
    const copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Скопировать"; copy.style.cssText = "background:#1a1d10;color:#d4e85a;border:0;border-radius:8px;padding:5px 12px;font:inherit;cursor:pointer";
    copy.onclick = () => { try { navigator.clipboard.writeText(code); copy.textContent = "Скопировано"; } catch (e) { /* ignore */ } };
    const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "close"); x.style.cssText = "background:none;border:0;font-size:20px;cursor:pointer;color:#1a1d10";
    x.onclick = () => { bar.remove(); document.body.style.paddingTop = ""; };
    bar.append(copy, x); document.body.appendChild(bar); document.body.style.paddingTop = bar.offsetHeight + "px";
  };
  if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
})();
