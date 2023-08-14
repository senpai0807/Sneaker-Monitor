const express = require('express');
const WebSocket = require('ws');
const createColorizedLogger = require('../Functions/logger');
const logger = createColorizedLogger();

const app = express();
let port = 3000;
const wssCheckpoint = new WebSocket.Server({ noServer: true });
const wssShopifyMonitor = new WebSocket.Server({ noServer: true });
const wssNike = new WebSocket.Server({ noServer: true });

app.use(express.json());

let shopifyStatuses = {};
let checkpointStatuses = {};

app.post('/shopifymonitor', (req, res) => {
  let { site, status } = req.body;
  shopifyStatuses[site] = status;
  res.send('Status updated');
});

app.get('/shopifymonitor', (req, res) => {
  res.json(shopifyStatuses);
});

app.post('/checkpoint', (req, res) => {
    let { site, status } = req.body;
    logger.info(`Received status for ${site}: ${status}`);
    checkpointStatuses[site] = status;
    res.send('Status updated');
});

app.get('/checkpoint', (req, res) => {
  res.json(checkpointStatuses);
});

function broadcast(message, logType, mode) {
    let wss;
    if (mode === 'Shopify Monitor') {
      wss = wssShopifyMonitor;
    } else if (mode === 'Shopify Checkpoint') {
      wss = wssCheckpoint;
    } else if (mode === 'Nike Monitor') {
      wss = wssNike;
    }
  
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ message, logType }));
        }
      });
    }
  }

app.server = app.listen(port, () => {
  logger.info(`Server listening at http://localhost:${port}`);
});

app.server.on('upgrade', (request, socket, head) => {
    if (request.url === '/shopifymonitor') {
      wssShopifyMonitor.handleUpgrade(request, socket, head, (ws) => {
        wssShopifyMonitor.emit('connection', ws, request);
      });
    } else if (request.url === '/checkpoint') {
      wssCheckpoint.handleUpgrade(request, socket, head, (ws) => {
        wssCheckpoint.emit('connection', ws, request);
      });
    } else if (request.url === '/nike') {
      wssNike.handleUpgrade(request, socket, head, (ws) => {
        wssNike.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

module.exports = { broadcast, shopifyStatuses };