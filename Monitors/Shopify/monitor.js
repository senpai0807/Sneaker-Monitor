const fs = require('fs');
const path = require('path');
const UserAgent = require('user-agents');
const { CookieJar } = require('tough-cookie');
const HttpsProxyAgent = require('https-proxy-agent');
const { Webhook, MessageBuilder } = require('discord-webhook-node');


const { broadcast, shopifyStatuses } = require('../../Dependencies/Server/server');
const createColorizedLogger = require('../../Dependencies/Functions/logger');
const logger = createColorizedLogger();


let currentProxyIndex = 0;

const sitesToMonitor = [
    'https://en.afew-store.com',
    'https://apbstore.com',
    'https://a-ma-maniere.com',
    'https://atmosusa.com',
    'https://bbcicecream.com',
    'https://bdgastore.com/',
    'https://bowsandarrowsberkeley.com',
    'https://burnrubbersneakers.com',
    'https://corporategotem.com',
    'https://courtsidesneakers.com',
    'https://creme321.com',
    'https://thedarksideinitiative.com',
    'https://deadstockofficial.com',
    'https://dtlr.com',
    'https://shop-us.doverstreetmarket.com',
    'https://extrabutterny.com',
    'https://feature.com',
    'https://gallery.canary---yellow.com',
    'https://gbny.com',
    'https://kicktheory.com',
    'https://kith.com',
    'https://lapstoneandhammer.com',
    'https://likelihood.us',
    'https://notre-shop.com',
    'https://onenessboutique.com',
    'https://packershoes.com',
    'https://rockcitykicks.com',
    'https://rsvpgallery.com',
    'https://ruleofnext.com',
    'https://saintalfred.com',
    'https://shoegallerymiami.com',
    'https://shoepalace.com',
    'https://shopnicekicks.com',
    'https://shopwss.com',
    'https://slamjam.com',
    'https://snkrroom.com',
    'https://sneakerpolitics.com',
    'https://socialstatuspgh.com',
    'https://solefly.com',
    'https://svrn.com',
    'https://thebettergeneration.com',
    'https://trophyroomstore.com',
    'https://thepremierstore.com',
    'https://store.unionlosangeles.com',
    'https://upnycstore.com',
    'https://wishatl.com',
    'https://xhibition.co',
    'https://undefeated.com'
  ];

const previousProductsPath = './products_sizes.json';
let previousProducts = fs.existsSync(previousProductsPath) 
? JSON.parse(fs.readFileSync(previousProductsPath, 'utf-8')) 
: {};
  
  logger.verbose('Shopify Monitor Starting...')
  const monitorSites = async () => {
    const got = (await import('got')).default;
    const cookieJar = new CookieJar();
    const userAgent = new UserAgent();
    let siteFailureCounts = new Map();
    const maxFailures = 3;
    let response;
    let formattedSite;
    let correctedSite;
    const productCooldowns = {};
    const cooldownPeriod = 1000 * 60 * 30;

    let proxiesPath = path.join(__dirname, '../../Dependencies/Proxies/proxies.txt');
    let proxiesData = fs.readFileSync(proxiesPath, 'utf8').split('\n');
    let proxies = [];

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
  
    for (const site of sitesToMonitor) {
        try {
            response = await got(`${site}/products.json`, {
                method: 'GET',
                followRedirect: true,
                maxRedirects: 100,
                agent: {
                  http: proxyAgent,
                  https: proxyAgent
                },
                headers: {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'accept-language': 'en-US,en;q=0.9',
                    'cache-control': 'max-age=0',
                    'user-agent': userAgent.toString()
                },
                cookieJar
            });

            if (response.statusCode === 200) {
                siteFailureCounts.set(site, 0);
                const data = JSON.parse(response.body);
                const products = data.products;

            const keywords = []; // IF YOU'D LIKE TO ADDS A KWS FILTER, SEPARATE BY COMMA
    
            for (const product of products) {
                if (keywords.length === 0 || keywords.some(keyword => product.title.includes(keyword))) {
                  let availableSizes = [];
                  for (const variant of product.variants) {
                    if (variant.available) {
                      availableSizes.push(variant.title);
                    }
                  }

                    availableSizes = availableSizes.join(', ');
                    const lastNotification = productCooldowns[product.id];
                    const prevSizes = previousProducts[product.id];
                    const imageSrc = product.images[0].src;
                    let qtLink = `${site}/${product.handle}`
                    const now = Date.now();

                    previousProducts[product.id] = availableSizes || "";

                if (!lastNotification || lastNotification.availableSizes !== availableSizes || now - lastNotification.timestamp > cooldownPeriod) {
                    if (availableSizes) {
                        if (prevSizes !== availableSizes) {
                            shopifyStatuses[site] = product.title;
                            const price = product.variants && product.variants[0] ? `$${product.variants[0].price}` : 'N/A';
            
                            if (site.includes('https://')) {
                                formattedSite = site.replace('https://', '');
                            }
                            if (formattedSite.includes('.com')) {
                                correctedSite = formattedSite.replace('.com', '');
                            }
            
                            const productMessage = `\n${correctedSite.toUpperCase()}\n${product.title}\nAvailable Sizes: ${availableSizes}\nPrice: ${price}`;
                            logger.http(productMessage);
                            broadcast(productMessage, 'http', 'Shopify Monitor');
                            productCooldowns[product.id] = { timestamp: now, availableSizes: availableSizes };
                            
                            const productDetails = {
                                site: site,
                                status: product.title
                            };
            
                            try {
                                await got.post('http://localhost:3001/shopifymonitor', {
                                    json: productDetails,
                                    responseType: 'text'
                                });
                            } catch (error) {
                                logger.error(`Failed to post status update: ${error.message}`);
                                if (error.response && error.response.body) {
                                    logger.error(`Server responded with: ${error.response.body}`);
                                }
                            }
                            let globalHook = new Webhook(``); // SET TO YOUR DESIGNATED WEBHOOKURL
                            globalHook.setUsername('Shopify Filtered'); // SET WHATEVER NAME YOU'D LIKE
                            globalHook.setAvatar(''); // SET ICONURL
                            
                            const productEmbed = new MessageBuilder()
                                .setTitle(product.title)
                                .setURL(qtLink)
                                .setColor("#5665DA")
                                .setDescription(`Price: ${price}`)
                                .setThumbnail(imageSrc)
                                .setFooter(``, "") // SET FOOTER TEXT AND ICONURL TO WHATEVER YOU'D LIKE
                                .setTimestamp();

                                for (const variant of product.variants) {
                                    if (variant.available) {
                                        let updatedLink = site + "/cart/" + variant.id + ":1";
                                        productEmbed.addField(variant.title, `[ATC](${updatedLink})`, true);
                                    }
                                }
                            
                                productEmbed.addField('Quicktask', `**[Cybersole](https://cybersole.io/dashboard/quicktask?input=${qtLink})** | **[MekAIO](https://dashboard.mekrobotics.com/quicktask?link=${qtLink})** | **[Valor](http://localhost:36485/quickTask?url=${qtLink})** | **[Wrath](http://localhost:32441/qt?input=${qtLink})**`, false);
                            await globalHook.send(productEmbed);

                        }
                    }
                }
            }
        }
    }
        fs.writeFileSync(previousProductsPath, JSON.stringify(previousProducts, null, 2));
        } catch (error) {
            logger.error(`Error Fetching Site [${response.statusCode}]`);
            const failureCount = (siteFailureCounts.get(site) || 0) + 1;
            siteFailureCounts.set(site, failureCount);
            if (failureCount >= maxFailures) {
                const delay = 10000 * failureCount;
                logger.warn(`Applying backoff for ${site}: ${delay}ms`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
}

var monitorProducts = async () => {
    try {
      await monitorSites();
      logger.warn('Checking For New Products...')
    } catch (error) {
      logger.error(error.message);
    }
  };

setInterval(monitorProducts, 10000);
  
module.exports = monitorProducts;