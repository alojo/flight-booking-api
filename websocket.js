const WebSocket = require("ws");

let wss; // WebSocket server instance

/**
 * takes the HTTP server, creates a WebSocket server attached to it, listens for new connections
 * @param {*} server
 */
const init = (server) => {
  wss = new WebSocket.Server({ server });
  wss.on("connection", (ws) => { // fires when a client connects. Logs it and listens for when they disconnect
    console.log("Client connected via WebSocket");
    ws.on("close", () => console.log("Client disconnected"));
  });
};

/**
 * loops through every connected client and sends them the data. The readyState === OPEN check makes sure we only send to clients that are still connected
 * @param {*} data
 * @returns
 */
const broadcast = (data) => {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data)); // converts the JavaScript object to a string because WebSocket only sends text
    }
  });
};

module.exports = { init, broadcast };
