
(function () {
  "use strict";

  let lastSentKey = null;
  let debounceTimer = null;

  function visibleText() {
    return (document.body && document.body.innerText) || "";
  }

  function hasAll(text, words) {
    return words.every((w) => text.includes(w));
  }

  function hasAny(text, words) {
    return words.some((w) => text.includes(w));
  }


  function detectState() {
    const path = location.pathname;
    const text = visibleText();

    if (path === "/" || path === "") {
      return { state: "menu" };
    }

    if (path === "/browse") {
      return { state: "browsing" };
    }

    if (path === "/share") {
      const params = new URLSearchParams(location.search);
      const title = params.get("t") || "Musique inconnue";
      const artist = params.get("a") || "Artiste inconnu";
      const difficulty = params.get("d") || null;
      const base = { title: decodeText(title), artist: decodeText(artist), difficulty };

      if (hasAny(text, ["RÉSULTAT"]) && hasAny(text, ["CLASSEMENT DU SALON", "REJOUER", "AUTRE MUSIQUE"])) {
        return { state: "finished", ...base };
      }

      if (hasAll(text, ["PAUSE", "REPRENDRE"]) && hasAny(text, ["RECOMMENCER", "QUITTER"])) {
        return { state: "paused", ...base };
      }

      if (hasAny(text, ["PRÉPARATION", "TÉLÉCHARGEMENT"]) && hasAny(text, ["EN ATTENTE", "LECTURE", "ÉCOUTE", "NOTES"])) {
        return { state: "preparing", ...base };
      }

      if (hasAny(text, ["S'ENTRAÎNER", "VITESSE DE LECTURE"]) && hasAny(text, ["JOUER", "CRÉER UN SALON"])) {
        return { state: "preparing", ...base };
      }

      return { state: "playing", ...base };
    }

    return { state: "unknown" };
  }

  function decodeText(v) {
    try {
      return decodeURIComponent(v.replace(/\+/g, " "));
    } catch (e) {
      return v;
    }
  }


  function sendState() {
    const state = detectState();
    const key = JSON.stringify(state);
    if (key === lastSentKey) return;
    lastSentKey = key;

    chrome.runtime.sendMessage({ type: "KIZAM_STATE", payload: state }).catch(() => {
    });
  }

  function scheduleSend(delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(sendState, delay);
  }


  const rawPushState = history.pushState;
  const rawReplaceState = history.replaceState;

  history.pushState = function (...args) {
    rawPushState.apply(this, args);
    window.dispatchEvent(new Event("kizam-locationchange"));
  };
  history.replaceState = function (...args) {
    rawReplaceState.apply(this, args);
    window.dispatchEvent(new Event("kizam-locationchange"));
  };
  window.addEventListener("popstate", () => window.dispatchEvent(new Event("kizam-locationchange")));
  window.addEventListener("kizam-locationchange", () => scheduleSend(200));


  const observer = new MutationObserver(() => scheduleSend(350));
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  scheduleSend(300);
  setInterval(sendState, 15000);


  function notifyClosed() {
    lastSentKey = null;
    chrome.runtime.sendMessage({ type: "KIZAM_STATE", payload: { state: "closed" } }).catch(() => {});
  }

  window.addEventListener("pagehide", notifyClosed);
})();
