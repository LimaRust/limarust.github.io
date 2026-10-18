# Lima Rust site - handoff notes (for another AI / developer)

Repo: Zimbu0/webLimaRust, branch `main`. Whole site = one file `index.html` (HTML+CSS+JS, no build step). Hosting: GitHub Pages.

## What it is
One-page responsive site for the Rust (Facepunch) server "Lima Rust", lemon style.
Fonts: Pixelify Sans + Rubik (Google Fonts). Palette (CSS vars): --bg #0c0e09, --panel #181A14, --lime #D4E85A, --green #6DBE3A, --orange #F29A3C, --rust #D2561F, --fg #F0F2E4, --mute #98A088.

## Structure
- All content comes from one config object `C = DEFAULT()` (around line 287): name, region, rates, type, ip, mapSize, discord, telegram, steam, pay, admins, players, promo, show, wipe, curMap, maps, why, ranks, kits, rules, cmds, faq, donate.
- Sections: home, cabinet, why, ranks, map (current map + voting), kits, wipe, rules (side menu + search, commands last), top, donate, faq, discord+telegram, footer with legal modals (terms/privacy/refund).
- Login modal: Steam ID (17 digits) - DEMO only. Demo IDs: 76561198000000001 (admin), 76561198000000002 (VIP).
- Admin drawer (gear icon, admins only): General, Sections and promo, Wipe, Maps, Ranks, Kits, Rules, Commands, FAQ, Donate, Links, Access, Data. Generic editor: inputs with `data-p="path.to.field"` + `data-ty` (s/n/b), `data-del`, `data-add` + `data-tpl`.
- State in localStorage: `lima_site3` (config), `lima_acc3` (accounts), `lima_vote3` (map votes).
- Wipe logic: weekly Friday at a set hour, Europe/Berlin; first Thursday of month (date <= 7) = Thursday wipe if `wipe.thu` is true. Helpers: berlinOff, berlin, nextWipes, lastWipe, sinceWipe.
- Map preview: procedural pixel map `drawMap(canvas, seed)`; map image upload resized to 640px JPEG data URI.

## Changes made, in order
1. Built the game-menu prototype (separate file, not in this repo) and design prompts.
2. Built the site in the same style, first with shop and rubles.
3. Per user request: prices in EUR, shop removed, added Ranks, "Why play here", map voting (1 vote per account, changeable), wipe schedule, rules like the in-game menu, commands, top, donate ("In development" while `C.pay` empty), FAQ, Discord + Telegram, Physgun-style footer, legal modals, no refunds.
4. Added Steam-ID login, cabinet (enlarged), logout button at the bottom, small CSS-only animated burger, admin mini-editor.
5. Fixed bugs: duplicate `top` identifier (renamed `renderTop`), nav overflow, `.vote .in` styling clash (renamed `.vi`).
6. Published to GitHub: replaced placeholder index.html, added README.md.
7. Set real links: Discord `discord.gg/fVWnrjjS5u`, Telegram `t.me/LimaRust`, Steam group `steamcommunity.com/groups/LimaRust` (in `DEFAULT()`).

## Known limitations / TODO
- Login and admin are client-side only (demo). Real version needs server-side Steam OpenID and checks.
- Placeholders: server IP, donate URL (`lima-rust.example`), top players, online count, map previews.
- Legal texts are brief; have them reviewed.
- Saved settings live in each visitor's browser (localStorage); admin edits do not reach other visitors. To make edits global, change the defaults in `DEFAULT()` and push.
- The in-game Oxide/C# menu plugin is not written yet.
