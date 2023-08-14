const monitorProducts = require('./Monitors/Shopify/monitor');
const monitor = require('./Monitors/Shopify/checkpoint');
const monitorNike = require('./Monitors/Nike/nike');
const createColorizedLogger = require('./Dependencies/Functions/logger');
const logger = createColorizedLogger();
require('./Dependencies/Server/server');

async function main() {
    monitorProducts().then(async () => {
      await monitor().then(async () => {
          await monitorNike()
        }).catch((err) => {
            logger.error(err);
        });
}).catch((err) => {
    logger.error(err);
})};

main();