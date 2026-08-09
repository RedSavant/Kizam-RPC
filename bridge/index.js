require("dotenv").config();
const { Client } = require("@xhayper/discord-rpc");
const { WebSocketServer } = require("ws");


const DEFAULT_CLIENT_ID = "1536021061454528572"; // CLIENTID of Kizam APP (change it in the .env)

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || DEFAULT_CLIENT_ID;
const PORT = process.env.BRIDGE_PORT ? Number(process.env.BRIDGE_PORT) : 7654;

const rpc = new Client({ clientId: CLIENT_ID });

let discordReady = false;
let startTimestamp = Date.now();
let lastStateKey = null;
let lastStateType = null;

rpc.on("ready", () => {
  discordReady = true;
  console.log(`Connecté à Discord (${rpc.user?.username ?? "utilisateur inconnu"}).`);
});

rpc.on("disconnected", () => {
  discordReady = false;
  console.log("Déconnecté de Discord, nouvelle tentative...");
});

function login() {
  rpc.login().catch((err) => {
    console.error("Impossible de se connecter à Discord :", err.message);
    console.error("Vérifie que le client Discord de bureau est bien lancé.");
    setTimeout(login, 8000);
  });
}
login();


function buildActivity(state) {
  const common = {
    largeImageKey: "kizam_logo",
    largeImageText: "KIZAM",
    instance: false,
  };

  switch (state.state) {
    case "menu":
      return {
        ...common,
        details: "Dans le menu principal",
        state: "Choisit ce qu'il va faire",
        startTimestamp,
      };

    case "browsing":
      return {
        ...common,
        details: "Cherche une musique",
        state: "Parcourt le catalogue",
        startTimestamp,
      };

    case "preparing":
      return {
        ...common,
        details: "Se prépare à jouer",
        state: formatSong(state),
        startTimestamp,
      };

    case "playing":
      return {
        ...common,
        details: `Joue : ${state.title || "Musique inconnue"}`,
        state: state.artist ? `par ${state.artist}` : undefined,
        startTimestamp,
      };

    case "paused":
      return {
        ...common,
        details: "En pause",
        state: formatSong(state),
        startTimestamp,
      };

    case "finished":
      return {
        ...common,
        details: "Partie terminée",
        state: formatSong(state),
      };

    case "closed":
      return null;

    default:
      return null;
  }
}

function formatSong(state) {
  if (state.title && state.artist) return `${state.title} — ${state.artist}`;
  return state.title || state.artist || undefined;
}


async function updatePresence(state) {
  if (!discordReady) return;

  const key = JSON.stringify(state);
  if (key === lastStateKey) return;

  if (state.state !== lastStateType) {
    startTimestamp = Date.now();
    lastStateType = state.state;
  }
  lastStateKey = key;

  const activity = buildActivity(state);
  try {
    if (!activity) {
      await rpc.user?.clearActivity();
    } else {
      await rpc.user?.setActivity(activity);
    }
  } catch (err) {
    console.error("Erreur en mettant à jour le statut Discord :", err.message);
  }
}


const wss = new WebSocketServer({ port: PORT, host: "127.0.0.1" });
console.log(`Bridge démarré sur ws://127.0.0.1:${PORT}`);

wss.on("connection", (socket) => {
  console.log("Extension connectée.");

  socket.on("message", (raw) => {
    try {
      const state = JSON.parse(raw.toString());
      updatePresence(state);
    } catch (err) {
      console.error("Message invalid reçu de l'extension :", err.message);
    }
  });

  socket.on("close", () => console.log("Extension déconnectée."));
});


async function shutdown() {
  try {
    await rpc.user?.clearActivity();
  } catch (e) {
    /* meow :3 */
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
