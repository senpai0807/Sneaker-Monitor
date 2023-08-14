const fs = require('fs');
const path = require('path');
const UserAgent = require('user-agents');
const { CookieJar } = require('tough-cookie');
const HttpsProxyAgent = require('https-proxy-agent');
const { broadcast } = require('../../Dependencies/Server/server');


const createColorizedLogger = require('../../Dependencies/Functions/logger');
const logger = createColorizedLogger();
let currentProxyIndex = 0;
let backoffDelay = 1000;
const maxBackoffDelay = 30000;
let proxiesPath;
let proxiesData;
let proxies;

const loadExistingProducts = async () => {
    try {
      const rawData = fs.readFileSync('nikeProducts.json', 'utf8');
      return JSON.parse(rawData);
    } catch (err) {
      return {};
    }
  };
  

logger.verbose('Nike Monitor Starting...')
const nikeMonitor = async () => {
    const got = (await import('got')).default;
    const cookieJar = new CookieJar();
    const userAgent = new UserAgent();
    let productFetch;



    proxiesPath = path.join(__dirname, '../../Dependencies/Proxies/proxies.txt');
    proxiesData = fs.readFileSync(proxiesPath, 'utf8').split('\n');
    proxies = [];

    proxiesData.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            proxies.push(line);
        }
    });

    const randomIndex = Math.floor(Math.random() * proxies.length);
    proxy = proxies[randomIndex];
    [ip, port, username, passwordProxy] = proxy.split(':');

    const proxyAgent = new HttpsProxyAgent(`http://${username}:${passwordProxy}@${ip}:${port}`);

    try {
        productFetch = await got('https://api.nike.com/product_feed/threads/v2/', {
            method: 'GET',
            followRedirect: true,
            maxRedirects: 100,
            agent: {
                http: proxyAgent,
                https: proxyAgent
            },
            searchParams: new URLSearchParams([
                ['anchor', '0'],
                ['count', '50'],
                ['filter', 'marketplace(US)'],
                ['filter', 'language(en)'],
                ['filter', 'inStock(true)'],
                ['filter', 'productInfo.merchPrice.discounted(false)'],
                ['filter', 'channelId(010794e5-35fe-4e32-aaff-cd2c74f89d61)'],
                ['filter', 'exclusiveAccess(true,false)'],
                ['fields', 'active'],
                ['fields', 'id'],
                ['fields', 'lastFetchTime'],
                ['fields', 'productInfo'],
                ['fields', 'publishedContent.nodes'],
                ['fields', 'publishedContent.properties.coverCard'],
                ['fields', 'publishedContent.properties.productCard'],
                ['fields', 'publishedContent.properties.products'],
                ['fields', 'publishedContent.properties.publish.collections'],
                ['fields', 'publishedContent.properties.relatedThreads'],
                ['fields', 'publishedContent.properties.seo'],
                ['fields', 'publishedContent.properties.threadType'],
                ['fields', 'publishedContent.properties.custom']
            ]),
            headers: {
                'authority': 'api.nike.com',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'en-US,en;q=0.9',
                'cache-control': 'max-age=0',
                'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': userAgent.toString()
            },
            cookieJar
        });
        const products = JSON.parse(productFetch.body);
        const existingProducts = await loadExistingProducts();

        products.objects.forEach(product => {
            let data = product.productInfo[0];
            let status = data.merchProduct.status;
            let sku = data.merchProduct.styleColor;
            let retail = data.merchPrice.currentPrice.toString();
            let title = data.productContent.title;
            let stockInfo = '';
            let stockLevels = {};
            data.skus.forEach((value, i) => {
                const level = data.availableSkus[i].level;
                if (level !== 'OOS') {
                    stockInfo += `\nSize: ${data.skus[i].nikeSize} | Stock: ${level}`;
                    stockLevels[data.skus[i].nikeSize] = level;
                }
            });
            const productId = `${title}_${sku}`;

            if (
                existingProducts[productId] &&
                (new Date() - new Date(existingProducts[productId].timestamp) < 3600000) &&
                JSON.stringify(existingProducts[productId].stockLevels) === JSON.stringify(stockLevels)
            ) {
                return;
            }

            data.skus.forEach((value, i) => {
                if (data.availableSkus[i].level !== 'OOS') {
                    stockInfo += `\nSize: ${data.skus[i].nikeSize} | Stock: ${data.availableSkus[i].level}`;
                }
            });
        
            if (!stockInfo) {
                stockInfo = '\nAll sizes OOS';
            }

        
            let productMessage = `\nTitle: ${title}\nSKU: ${sku}\nStatus: ${status}\nPrice: ${retail}\nAvailable Stock: ${stockInfo}`;
            logger.http(`\nTitle: ${title}\nSKU: ${sku}\nStatus: ${status}\nPrice: ${retail}\nAvailable Stock: ${stockInfo}`);
            broadcast(productMessage, 'http', 'Nike Monitor');

            existingProducts[productId] = {
                title,
                sku,
                stockInfo,
                stockLevels,
                timestamp: new Date().toISOString()
            };
        });

        fs.writeFileSync('nikeProducts.json', JSON.stringify(existingProducts, null, 2));
    } catch (error) {
        logger.error(error);
    }
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
}

const rotateProxy = () => {
    proxies.splice(currentProxyIndex, 1);
    fs.writeFileSync(proxiesPath, proxies.join('\n'));
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
    backoffDelay = Math.min(backoffDelay * 2, maxBackoffDelay);
}


var monitorNike = async () => {
    try {
      await nikeMonitor();
      logger.warn('Checking For New Products...')
      backoffDelay = 1000;
    } catch (error) {
      logger.error(error.message);
      rotateProxy();
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      logger.warn('Rotating Proxies...');
    }
  };

setInterval(monitorNike, 10000);
  
module.exports = monitorNike;