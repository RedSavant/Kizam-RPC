const BRIDGE_URL = "ws://127.0.0.1:7654";
const KEEPALIVE_ALARM = "kizam-keepalive";

let ws = null;
let currentState = null;
let activeKizamTabId = null;

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  try {
    ws = new WebSocket(BRIDGE_URL);

    ws.addEventListener("open", () => {
      console.log("[Kizam RPC] connecté au pont local");
      chrome.storage.local.set({ bridgeConnected: true });
      if (currentState) ws.send(JSON.stringify(currentState));
    });

    ws.addEventListener("close", () => {
      ws = null;
      chrome.storage.local.set({ bridgeConnected: false });
    });

    ws.addEventListener("error", () => {
      try {
        ws.close();
      } catch (e) {
        /* noot noot */
      }
      ws = null;
      chrome.storage.local.set({ bridgeConnected: false });
    });
  } catch (e) {
    ws = null;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.4 }); // 24s
  connect();
});

chrome.runtime.onStartup.addListener(() => {
  connect();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEPALIVE_ALARM) connect();
});

function sendToBridge(state) {
  currentState = state;
  chrome.storage.local.set({ lastState: state });
  connect();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(state));
  }
}

function clearActiveTab(tabId) {
  if (tabId === activeKizamTabId) {
    activeKizamTabId = null;
    sendToBridge({ state: "closed" });
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message && message.type === "KIZAM_STATE") {
    if (sender.tab && sender.tab.id !== undefined) {
      activeKizamTabId = sender.tab.id;
    }
    sendToBridge(message.payload);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => clearActiveTab(tabId));

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && !changeInfo.url.startsWith("https://kizam.fr")) {
    clearActiveTab(tabId);
  }
});

connect();
