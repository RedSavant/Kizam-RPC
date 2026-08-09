const STATE_LABELS = {
    menu: "Dans le menu principal",
    browsing: "Recherche d'une musique",
    preparing: "Préparation à la lecture",
    playing: "Joue",
    paused: "En pause",
    finished: "Jeu terminé",
    closed: "Jeu quitté",
    unknown: "État inconnu"
}

function render({ bridgeConnected, lastState }) {
  const dot = document.getElementById("dot");
  const status = document.getElementById("status");
  const stateEl = document.getElementById("state");

  dot.classList.toggle("ok", !!bridgeConnected);
  status.textContent = bridgeConnected
    ? "Statut connecté"
    : "Impossible de se connecter au statut";

  if (lastState) {
    const label = STATE_LABELS[lastState.state] || lastState.state;
    let html = `<span class="label">État :</span> ${label}`;
    if (lastState.title) {
      html += `<br/><span class="label">Titre :</span> ${lastState.title}`;
    }
    if (lastState.artist) {
      html += `<br/><span class="label">Artiste :</span> ${lastState.artist}`;
    }
    stateEl.innerHTML = html;
  }
}

chrome.storage.local.get(["bridgeConnected", "lastState"], render);

chrome.storage.onChanged.addListener((changes) => {
  chrome.storage.local.get(["bridgeConnected", "lastState"], render);
});
