const fs = require('fs');
const path = require('path');
const UserAgent = require('user-agents');
const { CookieJar } = require('tough-cookie');
const HttpsProxyAgent = require('https-proxy-agent');
const { Webhook, MessageBuilder } = require('discord-webhook-node');


const createColorizedLogger = require('../../Dependencies/Functions/logger');
const logger = createColorizedLogger();
const variantParser = require('../../Dependencies/Functions/variant');
const { broadcast } = require('../../Dependencies/Server/server');
let currentProxyIndex = 0;
let discordEmbedCooldowns = {};
let siteStates = {};
const EMBED_COOLDOWN_PERIOD = 30 * 60 * 1000;

let globalHook = new Webhook(``); // CHANGE TO YOUR DESIGNATED WEBHOOK
globalHook.setUsername('Checkpoint'); // CHANGE TO WHATEVER NAME YOU WISH
globalHook.setAvatar(''); // CHANGE THIS TO BE YOUR IMAGE URL

// SITES ARRAY - ADD WHATEVER SHOPIFY SITE YOU'D LIKE
let sitesToMonitor = [
    'https://www.apbstore.com',
    'https://www.a-ma-maniere.com',
    'https://www.atmosusa.com',
    'https://www.bbcicecream.com',
    'https://bdgastore.com',
    'https://gallery.canary---yellow.com',
    'https://www.dtlr.com',
    'https://gbny.com',
    'https://rockcitykicks.com',
    'https://rsvpgallery.com',
    'https://www.ruleofnext.com',
    'https://www.saintalfred.com',
    'https://www.shoepalace.com',
    'https://shopnicekicks.com',
    'https://www.shopwss.com',
    'https://slamjam.com',
    'https://sneakerpolitics.com',
    'https://www.trophyroomstore.com',
    'https://www.xhibition.co',
    'https://undefeated.com'
  ];


// SITE PRODUCT LINKS TO USE TO ATC TO CHECK FOR REDIRECT
let productLinks = {
    'https://www.apbstore.com': [
        'https://www.apbstore.com/collections/shoes/products/yeezy-boost-350-v2-bone-1'
    ],
    'https://www.a-ma-maniere.com': [
        'https://www.a-ma-maniere.com/collections/new-arrivals-1/products/yeezy-boost-350-v2-bone-1'
    ],
    'https://www.atmosusa.com': [
        'https://www.atmosusa.com/collections/new-arrivals/products/air-jordan-7-retro-black-chambray'
    ],
    'https://bdgastore.com': [
        'https://bdgastore.com/products/w-nike-dunk-low-lx-nbhd'
    ],
    'https://gallery.canary---yellow.com': [
        'https://gallery.canary---yellow.com/products/nike-air-force-1-mid-x-off-white%C2%AA-white-clear-white'
    ],
    'https://www.dtlr.com': [
        'https://www.dtlr.com/collections/men-footwear-casual/products/javi-evidence-evidence-021-black-grey'
    ],
    'https://gbny.com': [
        'https://gbny.com/products/adidas-yeezy-350-v2-cmpct-slate-onyx-mens'
    ],
    'https://www.notre-shop.com': [
        'https://www.notre-shop.com/collections/new-arrivals/products/wales-bonner-sl72-knit-sneaker-in-team-green-collegiate-gold-dark-brown'
    ],
    'https://rockcitykicks.com': [
        'https://rockcitykicks.com/collections/sn/products/adidas-ultraboost-5-0-dna-cwhite-silvmt-minrus'
    ],
    'https://rsvpgallery.com': [
        'https://rsvpgallery.com/products/adidas-yeezy-700-v3-copper-fade-2'
    ],
    'https://www.ruleofnext.com': [
        'https://www.ruleofnext.com/products/air-jordan-1-mid-1'
    ],
    'https://www.saintalfred.com': [
        'https://www.saintalfred.com/collections/footwear-1/products/copy-of-gazelle-indoor'
    ],
    'https://www.shoepalace.com': [
        'https://www.shoepalace.com/products/nike-dv0833-101-dunk-low-clear-jade-mens-basketball-shoes-white-clear-jade'
    ],
    'https://shopnicekicks.com': [
        'https://shopnicekicks.com/products/adidas-hq6316-yeezy-boost-350-v2-bone-mens-lifestyle-shoe-bone'
    ],
    'https://www.shopwss.com': [
        'https://www.shopwss.com/collections/all-mens-shoes/products/cw2288_111'
    ],
    'https://slamjam.com': [
        'https://slamjam.com/collections/sneakers/products/nike-footwear-dunk-low-retro-prm-multicolor-j279463'
    ],
    'https://sneakerpolitics.com': [
        'https://sneakerpolitics.com/collections/footwear/products/air-jordan-1-low-se-hemp-light-british-tan-1'
    ],
    'https://www.trophyroomstore.com': [
        'https://www.trophyroomstore.com/products/nike-air-force-1-07-lv8-sail-platinum-tint'
    ],
    'https://www.xhibition.co': [
        'https://www.xhibition.co/collections/mens-sneakers/products/dunk-low-retro-premium'
    ],
    'https://undefeated.com': [
        'https://undefeated.com/collections/all/products/jordan-aj-1-low-black-universityblue-white'
    ]
  };


// YOU CAN ADD MORE SIZES IF YOU'D LIKE FOR MORE RANDOMIZED ATC REQUESTS
let sizeRange = [
    '10'
]
  
logger.verbose('Checkpoint Monitor Starting...');

var checkpointMonitor = async () => {
    const got = (await import('got')).default;
    let cookieJar = new CookieJar();
    let userAgent = new UserAgent();


    let proxiesPath = path.join(__dirname, '../../Dependencies/Proxies/proxies.txt');
    let proxiesData = fs.readFileSync(proxiesPath, 'utf8').split('\n');
    let proxies = [];

    proxiesData.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            proxies.push(line);
        }
    });

    let randomIndex = Math.floor(Math.random() * proxies.length);
    proxy = proxies[randomIndex];
    [ip, port, username, passwordProxy] = proxy.split(':');
    let proxyAgent = new HttpsProxyAgent(`http://${username}:${passwordProxy}@${ip}:${port}`);

  
for (const site of sitesToMonitor) {
    let newState;

    if (productLinks[site]) {
    for (const productLink of productLinks[site]) {

        let randomSizeIndex = Math.floor(Math.random() * sizeRange.length);
        let selectedSize = sizeRange[randomSizeIndex];
        let { variant } = await variantParser(productLink, selectedSize, site);
        let productVariant = variant.id[0]._.toString();

        try {
            await got(`${site}/cart/add.js`, {
                method: 'POST',
                followRedirect: true,
                maxRedirects: 100,
                agent: {
                  http: proxyAgent,
                  https: proxyAgent
                },
                headers: {
                    'accept-language': 'en-US,en;q=0.9',
                    'origin': site,
                    'referer': productLink,
                    'user-agent': userAgent.toString(),
                    'x-requested-with': 'XMLHttpRequest'
                },
                form: {
                    'form_type': 'product',
                    'utf8': '✓',
                    'id': productVariant,
                },
                cookieJar
              }).then(addToCart => {
                if (addToCart.statusCode === 200) {
                    return got(`${site}/cart.js`, {
                        method: 'GET',
                        headers: {
                          'accept-language': 'en-US,en;q=0.9',
                          'referer': productLink,
                          'user-agent': userAgent.toString(),
                          'x-requested-with': 'XMLHttpRequest'
                        },
                        agent: {
                            http: proxyAgent,
                            https: proxyAgent
                        },
                        cookieJar
                  }).then(cartResponse => {
                      return cartResponse.body;
                  });
                }
              }).then(cartResponse => {
                    return got(`${site}/cart`, {
                        method: 'POST',
                        headers: {
                            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                            'accept-language': 'en-US,en;q=0.9',
                            'cache-control': 'max-age=0',
                            'origin': site,
                            'user-agent': userAgent.toString()
                        },
                        form: {
                            'updates[]': '1',
                            'checkout': ''
                        },
                        followRedirect: false,
                        agent: {
                            http: proxyAgent,
                            https: proxyAgent
                        },
                        cookieJar
                    })
            }).then(redirectResponse => {
                let checkpointRedirect = redirectResponse.headers.location;

                if (checkpointRedirect.includes('checkouts')) {
                    newState = 'CHECKPOINT DOWN';
                    logger.http(`Checkpoint Is Disabled On ${site}`);
                    broadcast(`Checkpoint Is Disabled On ${site}`, 'http', 'Shopify Checkpoint'); // BROADCAST FUNCTION RELATES TO IF YOU WOULD LIKE TO CONNECT YOUR SOFTWARE 

                  } else if (checkpointRedirect.includes('checkpoint')) {
                    newState = 'CHECKPOINT UP';
                    logger.verbose(`Checkpoint Is Enabled On ${site}`);
                    broadcast(`Checkpoint Is Enabled On ${site}`, 'verbose', 'Shopify Checkpoint'); // BROADCAST FUNCTION RELATES TO IF YOU WOULD LIKE TO CONNECT YOUR SOFTWARE
                  }

                  if (newState !== siteStates[site]) {
                    let canSendEmbed = true;
                    if (discordEmbedCooldowns[site] && new Date().getTime() - discordEmbedCooldowns[site] < EMBED_COOLDOWN_PERIOD) {
                      canSendEmbed = false;
                    }

                    if (canSendEmbed) {
                        if (newState === 'CHECKPOINT DOWN') {
                            const checkpointDown = new MessageBuilder()
                            .setAuthor(site, "", site) // MAKE SURE TO SET AUTHOR ICONURL
                            .setColor("#5665DA")
                            .setDescription(`**[CHECKPOINT DISABLED](${site})**`)
                            .setFooter(``, "") // MAKE SURE TO SET FOOTER TEXT AND ICONURL
                            .setTimestamp();
                        
                        globalHook.send(checkpointDown);
                          discordEmbedCooldowns[site] = new Date().getTime();

                        } else if (newState === 'CHECKPOINT UP') {
                            const checkpointUp = new MessageBuilder()
                            .setAuthor(site, "", site) // MAKE SURE TO SET AUTHOR ICONURL
                            .setColor("#5665DA")
                            .setDescription(`**[CHECKPOINT ENABLED](${site})**`)
                            .setFooter(``, "") // MAKE SURE TO SET FOOTER TEXT AND ICONURL
                            .setTimestamp();
                        
                        globalHook.send(checkpointUp);
                          discordEmbedCooldowns[site] = new Date().getTime();
                        }
                      }
                  
                      siteStates[site] = newState;
                    }
                  
                  got.post('http://localhost:3000/checkpoint', {
                    json: { site, status: newState }
                  }).catch(error => {
                    logger.error(`Failed to send status to /checkpoint: ${error.message}`);
                  });
                })

            } catch (error) {
                logger.error(error.message);
            }
        }
    }
}
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;

};

var monitor = async () => {
    try {
      await checkpointMonitor();
      logger.warn('Monitoring For Checkpoint...');
    } catch (error) {
      logger.error(error.message);
    }
  };

setInterval(monitor, 60000);
  
module.exports = monitor;