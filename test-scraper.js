// Test the new KB Home scraper
const { scrapeKBHomesLive } = require('./src/lib/kb-home-scraper.ts');

async function testScraper() {
  try {
    console.log('Testing KB Home live scraper...');
    const homes = await scrapeKBHomesLive();
    console.log(`Found ${homes.length} homes:`);
    homes.forEach((home, index) => {
      console.log(`${index + 1}. ${home.modelName} - ${home.address} - $${home.price.toLocaleString()}`);
    });
  } catch (error) {
    console.error('Error testing scraper:', error);
  }
}

testScraper();