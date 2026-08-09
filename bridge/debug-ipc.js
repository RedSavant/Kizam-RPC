const net = require("net");

// Debug ipc system if the RPC doesnt works

const clientId = process.argv[2];
if (!clientId) {
    console.error("Usage: node debug-ipc CLIENT_ID")
    process.exit(1);
}

const socketPath = `${process.env.XDG_RUNTIME_DIR || "/tmp"}/discord-ipc-0`;
console.log("Connexion au socket :", socketPath);

const socket = net.createConnection(socketPath);

socket.on("connect", () => {
  console.log("TCP/Unix connexion started with socket");

  const payload = JSON.stringify({ v: 1, client_id: clientId });
  const header = Buffer.alloc(8);
  header.writeInt32LE(0, 0); // opcode = HANDSHAKE
  header.writeInt32LE(Buffer.byteLength(payload), 4);

  socket.write(Buffer.concat([header, Buffer.from(payload)]));
  console.log("→ Handshake envoyé avec client_id =", clientId);
});

socket.on("data", (data) => {
  console.log("Date received from Discord (", data.length, "octets ) :");
  const opcode = data.readInt32LE(0);
  const length = data.readInt32LE(4);
  const json = data.slice(8, 8 + length).toString("utf8");
  console.log("  opcode:", opcode);
  console.log("  contenu:", json);
  socket.end();
});

socket.on("error", (err) => {
  console.error("Socket err :", err.message);
});

socket.on("close", () => {
  console.log("Connection closed");
});

socket.on("timeout", () => {
  console.error("Socket timeout");
});

setTimeout(() => {
  console.log("   10 seconds have elapsed without a response from Discord after the handshake..");
  console.log("   If you see this without saw \"Data received\" before");
  console.log("   the socket connexion works but discord ignore it");
  process.exit(1);
}, 10000);
