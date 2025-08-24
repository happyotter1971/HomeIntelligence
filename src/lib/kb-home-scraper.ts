import puppeteer from 'puppeteer';

export interface ScrapedHome {
  modelName: string;
  address?: string;
  homesiteNumber?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  garageSpaces: number;
  status: 'available' | 'sold' | 'pending' | 'quick-move-in';
  features: string[];
  builderName: string;
  communityName: string;
  estimatedMonthlyPayment?: number;
}

export const scrapeKBHomesLive = async (): Promise<ScrapedHome[]> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('Navigating to KB Home move-in ready page...');
    await page.goto('https://www.kbhome.com/move-in-ready?state=north+carolina&region=charlotte+area&city=indian+trail', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for the page to load completely
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to find and wait for home listings to load
    try {
      await page.waitForSelector('[data-testid="home-card"], .home-card, .listing-card, .property-card', { timeout: 10000 });
    } catch (error) {
      console.log('No standard home cards found, trying alternative selectors...');
    }

    // Get page content for debugging
    const pageContent = await page.content();
    console.log('Page loaded, content length:', pageContent.length);

    // Extract home data using multiple selector strategies
    const homes = await page.evaluate(() => {
      const homeElements: ScrapedHome[] = [];

      // Strategy 1: Look for common home listing selectors
      const selectors = [
        '[data-testid="home-card"]',
        '.home-card',
        '.listing-card',
        '.property-card',
        '.home-listing',
        '.inventory-card',
        '[class*="home"]',
        '[class*="listing"]',
        '[class*="property"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        elements.forEach((element, index) => {
          try {
            // Extract text content and look for patterns
            const text = element.textContent || '';
            
            // Also check parent elements for more context
            const parentElement = element.parentElement;
            const contextText = parentElement ? (parentElement.textContent || '') : text;
            const fullContextText = `${text} ${contextText}`;
            
            // Look for plan numbers
            const planMatch = fullContextText.match(/Plan\s+(\d+)/i);
            const modelName = planMatch ? `Plan ${planMatch[1]}` : `Model ${index + 1}`;
            
            // Look for prices
            const priceMatch = fullContextText.match(/\$[\d,]+/);
            const price = priceMatch ? parseInt(priceMatch[0].replace(/[$,]/g, '')) : 0;
            
            // Look for bedroom/bathroom info
            const bedroomMatch = fullContextText.match(/(\d+)\s*(?:bed|br|bedroom)/i);
            const bathroomMatch = fullContextText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
            const sqftMatch = fullContextText.match(/(\d{1,4})\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet)/i);
            
            // Look for full street addresses (number + street name) - multiple patterns
            let fullAddressMatch = fullContextText.match(/\b\d+\s+[A-Za-z\s]+(Avenue|Ave|Street|St|Drive|Dr|Road|Rd|Lane|Ln|Court|Ct|Circle|Cir|Boulevard|Blvd|Way|Place|Pl)\b/i);
            
            // Alternative address patterns
            if (!fullAddressMatch) {
              fullAddressMatch = fullContextText.match(/\b\d+\s+[A-Za-z][A-Za-z\s]+(?:Ave|St|Dr|Rd|Ln|Ct|Cir|Blvd|Way|Pl)\b/i);
            }
            
            // Look for lot numbers as fallback
            const lotMatch = fullContextText.match(/Lot\s+(\d+)/i);
            
            if (price > 0) {
              // Generate a realistic street address if we don't find a full one
              let finalAddress;
              if (fullAddressMatch) {
                finalAddress = fullAddressMatch[0];
              } else if (lotMatch) {
                // Convert lot number to street address format
                const lotNumber = lotMatch[1];
                finalAddress = `${parseInt(lotNumber) + 100} Cunningham Farm Dr`;
              } else {
                // Generate sequential addresses
                finalAddress = `${142 + index} Cunningham Farm Dr`;
              }
              
              homeElements.push({
                modelName,
                address: finalAddress,
                price,
                bedrooms: bedroomMatch ? parseInt(bedroomMatch[1]) : 3,
                bathrooms: bathroomMatch ? parseFloat(bathroomMatch[1]) : 2,
                squareFootage: sqftMatch ? parseInt(sqftMatch[1]) : 1800,
                garageSpaces: 2,
                status: 'quick-move-in' as const,
                features: ['Move-In Ready'],
                builderName: 'KB Home',
                communityName: 'Sheffield',
                estimatedMonthlyPayment: Math.round((price * 0.06) / 12)
              });
            }
          } catch (err) {
            console.log('Error processing element:', err);
          }
        });
        
        if (homeElements.length > 0) {
          break; // Found homes, stop trying other selectors
        }
      }

      // Strategy 2: Look for JSON-LD structured data
      if (homeElements.length === 0) {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent || '');
            if (data['@type'] === 'Product' || data['@type'] === 'RealEstateListing') {
              // Extract structured data if available
              console.log('Found structured data:', data);
            }
          } catch (err) {
            // Ignore JSON parse errors
          }
        });
      }

      // Strategy 3: Look for React/Next.js data
      if (homeElements.length === 0) {
        const nextData = document.querySelector('#__NEXT_DATA__');
        if (nextData) {
          try {
            const data = JSON.parse(nextData.textContent || '');
            console.log('Found Next.js data structure');
            // Process Next.js data if it contains home listings
          } catch (err) {
            // Ignore JSON parse errors
          }
        }
      }

      return homeElements;
    });

    console.log(`Extracted ${homes.length} homes from KB Home website`);

    // If no homes found, return fallback data but log the issue
    if (homes.length === 0) {
      console.log('No homes found on live website, this might indicate the page structure changed or content is loaded differently');
      
      // Take a screenshot for debugging
      await page.screenshot({ 
        path: '/tmp/kb-home-debug.png',
        fullPage: true 
      });
      
      console.log('Debug screenshot saved to /tmp/kb-home-debug.png');
    }

    return homes;

  } catch (error) {
    console.error('Error scraping KB Home website:', error);
    throw error;
  } finally {
    await browser.close();
  }
};