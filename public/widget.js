/*
 * Afaq Al Barakha chat widget.
 * Add to the main website (before </body>):
 *   <script src="https://chat.afaqalbarakha.com/widget.js" defer></script>
 * Optional: data-open-delay="8000" opens the chat automatically after 8s (once per session).
 */
(function () {
  if (window.__albarakhaWidget) return;
  window.__albarakhaWidget = true;

  var script = document.currentScript;
  var origin = new URL(script.src).origin;
  var openDelay = parseInt(script.getAttribute("data-open-delay") || "0", 10);

  var params = new URLSearchParams(window.location.search);
  var query = new URLSearchParams({ src: "website", page: window.location.href });
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].forEach(function (k) {
    if (params.get(k)) query.set(k, params.get(k));
  });

  var css = [
    ".abk-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:62px;height:62px;border-radius:9999px;border:1px solid #ebb811;",
    "background:radial-gradient(circle at 30% 25%,#1a5c48,#07100c 70%);box-shadow:0 18px 40px -12px rgba(35,226,155,.45),inset 0 -6px 12px rgba(35,226,155,.35);",
    "display:grid;place-items:center;cursor:pointer;transition:transform .4s cubic-bezier(.22,1,.36,1)}",
    ".abk-launcher:hover{transform:translateY(-3px)}",
    ".abk-launcher svg{width:26px;height:26px}",
    ".abk-tip{position:fixed;right:92px;bottom:34px;z-index:2147483000;background:#07100c;color:#f5f4ed;border:1px solid rgba(51,176,130,.35);",
    "padding:8px 14px;border-radius:9999px;font:500 13px/1.2 system-ui,sans-serif;white-space:nowrap;opacity:0;transform:translateX(6px);",
    "transition:all .4s cubic-bezier(.22,1,.36,1);pointer-events:none}",
    ".abk-launcher:hover+.abk-tip,.abk-tip.abk-show{opacity:1;transform:none}",
    ".abk-launcher[aria-expanded=true]+.abk-tip{display:none}",
    ".abk-frame{position:fixed;right:20px;bottom:96px;z-index:2147483001;width:400px;height:min(640px,calc(100vh - 120px));border:1px solid rgba(51,176,130,.25);",
    "border-radius:24px;overflow:hidden;background:#07100c;box-shadow:0 40px 120px -30px rgba(0,0,0,.8);opacity:0;transform:translateY(16px) scale(.98);",
    "pointer-events:none;transition:opacity .35s ease,transform .45s cubic-bezier(.22,1,.36,1)}",
    ".abk-frame.abk-open{opacity:1;transform:none;pointer-events:auto}",
    ".abk-frame iframe{width:100%;height:100%;border:0;display:block}",
    "@media (max-width:520px){.abk-frame{inset:0;width:100%;height:100%;border-radius:0;border:0}.abk-open~.abk-launcher,.abk-launcher.abk-hidden{display:none}}",
  ].join("");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var frameWrap = document.createElement("div");
  frameWrap.className = "abk-frame";
  frameWrap.setAttribute("role", "dialog");
  frameWrap.setAttribute("aria-label", "Chat with Afaq Al Barakha Investment");
  frameWrap.setAttribute("aria-hidden", "true");

  var launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "abk-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.setAttribute("aria-expanded", "false");
  var chatIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#ebb811" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12Z"/></svg>';
  var closeIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#ebb811" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  launcher.innerHTML = chatIcon;

  var tip = document.createElement("div");
  tip.className = "abk-tip";
  tip.textContent = "Talk to an investment advisor";

  document.body.appendChild(frameWrap);
  document.body.appendChild(launcher);
  document.body.appendChild(tip);

  var iframe = null;
  var isOpen = false;

  function open() {
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.src = origin + "/embed?" + query.toString();
      iframe.title = "Afaq Al Barakha investor assistant";
      iframe.allow = "clipboard-write";
      frameWrap.appendChild(iframe);
    }
    isOpen = true;
    frameWrap.classList.add("abk-open");
    frameWrap.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Close chat");
    launcher.innerHTML = closeIcon;
    if (window.innerWidth <= 520) launcher.classList.add("abk-hidden");
    tip.classList.remove("abk-show");
    try { sessionStorage.setItem("abk_opened", "1"); } catch { /* storage blocked */ }
  }

  function close() {
    isOpen = false;
    frameWrap.classList.remove("abk-open");
    frameWrap.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Open chat");
    launcher.innerHTML = chatIcon;
    launcher.classList.remove("abk-hidden");
    launcher.focus();
  }

  launcher.addEventListener("click", function () {
    if (isOpen) close();
    else open();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) close();
  });

  window.addEventListener("message", function (e) {
    if (e.origin === origin && e.data && e.data.type === "albarakha:close") close();
  });

  // Let the main site open the chat from its own buttons:
  //   window.AlbarakhaChat.open()
  window.AlbarakhaChat = { open: open, close: close };

  var opened = false;
  try { opened = sessionStorage.getItem("abk_opened") === "1"; } catch { /* storage blocked */ }
  if (openDelay > 0 && !opened) setTimeout(function () { if (!isOpen) open(); }, openDelay);
  else setTimeout(function () { if (!isOpen) tip.classList.add("abk-show"); setTimeout(function () { tip.classList.remove("abk-show"); }, 5000); }, 4000);
})();
