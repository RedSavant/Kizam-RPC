#!/usr/bin/env bash

set -euo pipefail

BRIDGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIT_TEMPLATE="$BRIDGE_DIR/kizam-rpc-bridge.service"
UNIT_TARGET_DIR="$HOME/.config/systemd/user"
UNIT_TARGET="$UNIT_TARGET_DIR/kizam-rpc-bridge.service"

if [ ! -f "$UNIT_TEMPLATE" ]; then
  echo "Erreur : $UNIT_TEMPLATE introuvable." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Erreur : node n'est pas dans le PATH. Installe Node.js avant de continuer." >&2
  exit 1
fi

if [ ! -d "$BRIDGE_DIR/node_modules" ]; then
  echo "node_modules introuvable, installation des dépendances..."
  (cd "$BRIDGE_DIR" && npm install)
fi

mkdir -p "$UNIT_TARGET_DIR"
sed "s#@BRIDGE_DIR@#$BRIDGE_DIR#g" "$UNIT_TEMPLATE" > "$UNIT_TARGET"

echo "Service généré dans $UNIT_TARGET (BRIDGE_DIR=$BRIDGE_DIR)"

systemctl --user daemon-reload
systemctl --user enable --now kizam-rpc-bridge.service

echo ""
echo "Installé et démarré. Commandes utiles :"
echo "  systemctl --user status kizam-rpc-bridge   # état du service"
echo "  journalctl --user -u kizam-rpc-bridge -f   # logs en direct"
echo "  systemctl --user disable --now kizam-rpc-bridge  # désinstaller/arrêter"