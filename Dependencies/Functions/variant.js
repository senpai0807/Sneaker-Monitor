const fetch = require('node-fetch');
const xml2js = require('xml2js');
const createColorizedLogger = require('./logger');
const logger = createColorizedLogger();

const parser = new xml2js.Parser();

async function variantParser(productLink, sizeRange, site) {
    const response = await fetch(`${productLink}.xml`);
    const xmlData = await response.text();
  
    const parsedData = await parser.parseStringPromise(xmlData);
  
    let product = {};
  
    if (parsedData && parsedData.hash && parsedData.hash.variants && parsedData.hash.variants[0] && parsedData.hash.variants[0].variant) {
      product.variants = parsedData.hash.variants[0].variant;
    }
  
    if (parsedData.hash.images && parsedData.hash.images[0] && parsedData.hash.images[0].image) {
      product.images = parsedData.hash.images[0].image;
    }
  
    if (parsedData.hash && parsedData.hash.title && parsedData.hash.title[0]) {
      product.title = parsedData.hash.title[0];
    }
  
    let variantsInRange = product.variants.filter((v) => {
      let size;
      if (
        site === 'https://www.apbstore.com' ||
        site === 'https://www.a-ma-maniere.com' ||
        site === 'https://www.atmosusa.com' ||
        site === 'https://www.dtlr.com' ||
        site === 'https://gallery.canary---yellow.com' ||
        site === 'https://gbny.com' ||
        site === 'https://rockcitykicks.com' ||
        site === 'https://rsvpgallery.com' ||
        site === 'https://www.saintalfred.com' ||
        site === 'https://www.shoepalace.com' ||
        site === 'https://shopnicekicks.com' ||
        site === 'https://www.shopwss.com' ||
        site === 'https://slamjam.com' ||
        site === 'https://sneakerpolitics.com' ||
        site === 'https://www.trophyroomstore.com'
        && v.option1 && v.option1[0]
      ) {
        size = isNaN(v.option1[0]) ? v.option1[0] : parseFloat(v.option1[0]);
      } else if (
        site === 'https://bdgastore.com' ||
        site === 'https://www.ruleofnext.com' ||
        site === 'https://www.xhibition.co' ||
        site === 'https://undefeated.com'
        && v.option2 && v.option2[0]) {
        size = isNaN(v.option2[0]) ? v.option2[0] : parseFloat(v.option2[0]);
      } else {
        let title = v.title[0];
        if (title.includes(" / Multicolor")) {
          title = title.replace(" / Multicolor", "");
        }
        size = isNaN(title) ? title : parseFloat(title);
      }
      
      if (!isNaN(size) && !isNaN(sizeRange)) {
        return size === parseFloat(sizeRange);
    } else {
        return size == sizeRange;
    }
  });
  
    if (variantsInRange.length === 0) {
      logger.error(`No variants found for size ${sizeRange}`);
    } else {
      let randomIndex = Math.floor(Math.random() * variantsInRange.length);
      let randomSize = variantsInRange[randomIndex].title[0];
      
      let variant = variantsInRange.find((v) => v.title[0] === randomSize);
      let cleanlink = productLink.split('?').toString();
      let partarr = cleanlink.split("/");
      cleanlink = partarr.slice(0, 3).join('/');
      
      let id = variant.id[0]._;
      let price = variant.price[0].replace('.', '');
      const updatedLink = cleanlink + "/cart/" + String(id) + ":1";
      return {
        updatedLink,
        variant: variant,
        price: price,
      };
    }
  }
  
  module.exports = variantParser;