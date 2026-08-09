# Kizam Discord Rich Presence

Show your live activity on [kizam.fr](https://kizam.fr) directly on your Discord status (In Menu, Searching, Playing, Results, etc.).

Since browser extensions can't speak directly to Discord's local IPC socket, this project is split into two parts:
- `extension/`: Chrome/Brave Manifest V3 extension monitoring `kizam.fr`.
- `bridge/`: A lightweight Node.js background process receiving events via WebSockets and sending them to Discord IPC.

```
kizam.fr -> Content Script -> Service Worker -> WebSocket -> Node Bridge -> IPC -> Discord
```

---

## Setup

### 1. Run the local bridge

> **Note:** Make sure the Discord desktop app is running.

```bash
git clone https://github.com/YOUR_USERNAME/kizam-rpc.git
cd kizam-rpc/bridge
npm install
npm start
```

You should see:
```text
Bridge listening on ws://127.0.0.1:7654
Connected to Discord (your_username)
```

Keep this terminal open while playing (or set up a background service below).

### 2. Install the extension

1. Open `chrome://extensions` or `brave://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` folder.
4. Head over to [kizam.fr](https://kizam.fr) and play.

Clicking the extension icon shows your current bridge connection status and active state for quick debugging.

---

## Status Mapping

| Page / State | Extension State | Discord Status |
|---|---|---|
| `/` | `menu` | In Main Menu |
| `/browse` | `browsing` | Browsing tracks |
| `/share?...` (Lobby/Loading) | `preparing` | Getting Ready — Track — Artist |
| `/share?...` (In-game) | `playing` | Playing: Track — by Artist |
| `/share?...` (Paused) | `paused` | Paused |
| `/share?...` (Results) | `finished` | Game Over — Track — Artist |
| Tab closed / Left site | `closed` | *(Status cleared)* |

---

## Optional Configuration

### Custom Discord Application
By default, the bridge uses a shared "KIZAM" app client ID. To use your own app ID and assets:
1. Create an application on the [Discord Developer Portal](https://discord.com/developers/applications).
2. Copy the **Application ID**.
3. In `bridge/`, duplicate `.env.example` to `.env` and set `DISCORD_CLIENT_ID`.
4. Upload an asset named `kizam_logo` under **Rich Presence -> Art Assets**.

### Auto-start on Linux (`systemd`)
A systemd user unit is included so you don't have to keep a terminal window open:

```bash
mkdir -p ~/.config/systemd/user
cp bridge/kizam-rpc-bridge.service ~/.config/systemd/user/
# Edit the service file if your repo isn't in ~/Downloads/kizam-rpc
systemctl --user daemon-reload
systemctl --user enable --now kizam-rpc-bridge.service
```

View logs at any time with:
```bash
journalctl --user -u kizam-rpc-bridge -f
```

---

## Troubleshooting UI Detection

Kizam is a Single Page Application (SPA) with dynamic CSS class names. Instead of fragile selectors, `extension/content.js` looks for specific on-screen text (e.g., "PRÉPARATION", "RÉSULTAT", "REPRENDRE").

If an update breaks state detection:
1. Open DevTools (`F12`) on `kizam.fr`.
2. Inspect the visible text during the broken state.
3. Update the string checks inside `detectState()` in `extension/content.js`.

PRs fixing detection rules are welcome!

---

## Technical Notes

- **Service Worker Persistence:** `extension/background.js` uses `chrome.alarms` to wake up every ~24s, bypassing Manifest V3's ~30s idle termination that would break the WebSocket.
- **SPA Routing:** `extension/content.js` patches `history.pushState` and `history.replaceState` for URL transitions, combined with a `MutationObserver` for state changes under identical URLs (`/share`).
- **RPC Library:** Built using `@xhayper/discord-rpc`.
- **IPC Debugging:** `bridge/debug-ipc.js` is included to test low-level Discord socket connectivity directly without the wrapper library.

---

## License

[MIT](LICENSE)
