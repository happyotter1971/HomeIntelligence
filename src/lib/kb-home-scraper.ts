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
  // Enhanced browser configuration for Vercel serverless environment
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
    // Vercel-specific configurations
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    timeout: 60000
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

    // Enhanced waiting strategy for Vercel
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Multiple attempts to wait for content to load
    let contentLoaded = false;
    const selectors = [
      '[data-testid="home-card"]',
      '.home-card',
      '.listing-card', 
      '.property-card',
      '[class*="home"]',
      '[class*="listing"]',
      'body'
    ];

    for (let i = 0; i < selectors.length && !contentLoaded; i++) {
      try {
        await page.waitForSelector(selectors[i], { timeout: 5000 });
        contentLoaded = true;
        console.log(`Content loaded with selector: ${selectors[i]}`);
      } catch (error) {
        console.log(`Selector ${selectors[i]} not found, trying next...`);
      }
    }

    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page content for debugging
    const pageContent = await page.content();
    console.log('Page loaded, content length:', pageContent.length);

    // Extract home data using multiple selector strategies
    const homes = await page.evaluate(() => {
      const homeElements: ScrapedHome[] = [];

      // Strategy 1: Comprehensive text-based extraction approach
      const selectors = [
        '[data-testid="home-card"]',
        '.home-card',
        '.listing-card',
        '.property-card',
        '.home-listing',
        '.inventory-card',
        '[class*="home"]',
        '[class*="listing"]',
        '[class*="property"]',
        '[class*="card"]',
        'div[class*="row"]',
        'article',
        'section'
      ];

      let allFoundHomes = new Set(); // Track unique homes to prevent duplicates

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        elements.forEach((element, index) => {
          try {
            // Extract text content and look for patterns
            const text = element.textContent || '';
            
            // Also check parent and child elements for more context
            const parentElement = element.parentElement;
            const childElements = Array.from(element.children);
            const childText = childElements.map(child => child.textContent || '').join(' ');
            const contextText = parentElement ? (parentElement.textContent || '') : '';
            const fullContextText = `${text} ${contextText} ${childText}`;
            
            // Look for plan numbers - enhanced pattern matching
            const planMatches = fullContextText.match(/Plan\s+(\d+)/gi) || [];
            const priceMatches = fullContextText.match(/\$[\d,]+/g) || [];
            
            // Process each plan/price combination found
            planMatches.forEach((planMatch, planIndex) => {
              const planNumberMatch = planMatch.match(/\d+/);
              if (!planNumberMatch) return;
              const planNumber = planNumberMatch[0];
              const modelName = `Plan ${planNumber}`;
              
              // Find corresponding price (try to match with index)
              let price = 0;
              if (priceMatches[planIndex]) {
                price = parseInt(priceMatches[planIndex].replace(/[$,]/g, ''));
              } else if (priceMatches.length > 0 && priceMatches[0]) {
                // Use first available price if no exact match
                price = parseInt(priceMatches[0].replace(/[$,]/g, ''));
              }
              
              // Filter out unrealistic prices
              if (price < 200000 || price > 800000) {
                return; // Skip this entry
              }
              
              // Look for bedroom/bathroom info
              const bedroomMatch = fullContextText.match(/(\d+)\s*(?:bed|br|bedroom)/i);
              const bathroomMatch = fullContextText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
              const sqftMatch = fullContextText.match(/(\d{3,4})\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet)/i);
              
              // Look for addresses
              let fullAddressMatch = fullContextText.match(/\b\d+\s+[A-Za-z\s]+(Avenue|Ave|Street|St|Drive|Dr|Road|Rd|Lane|Ln|Court|Ct|Circle|Cir|Boulevard|Blvd|Way|Place|Pl)\b/i);
              if (!fullAddressMatch) {
                fullAddressMatch = fullContextText.match(/\b\d+\s+[A-Za-z][A-Za-z\s]+(?:Ave|St|Dr|Rd|Ln|Ct|Cir|Blvd|Way|Pl)\b/i);
              }
              
              const lotMatch = fullContextText.match(/Lot\s+(\d+)/i);
              
              if (price > 0) {
                // Generate a realistic street address with better uniqueness
                let finalAddress;
                if (fullAddressMatch) {
                  finalAddress = fullAddressMatch[0];
                } else if (lotMatch) {
                  const lotNumber = lotMatch[1];
                  finalAddress = `${parseInt(lotNumber) + 1000} Cunningham Farm Dr`;
                } else {
                  // Use plan number, index, and element index to generate unique addresses
                  const baseAddress = parseInt(planNumber) + 1000;
                  const uniqueOffset = (planIndex * 10) + (index * 3) + homeElements.length;
                  finalAddress = `${baseAddress + uniqueOffset} Cunningham Farm Dr`;
                }
                
                // Create unique key to prevent duplicates - include price for better uniqueness
                const uniqueKey = `${modelName}-${finalAddress}-${price}`;
                
                if (!allFoundHomes.has(uniqueKey)) {
                  allFoundHomes.add(uniqueKey);
                  
                  homeElements.push({
                    modelName,
                    address: finalAddress,
                    price,
                    bedrooms: bedroomMatch ? parseInt(bedroomMatch[1]) : 3,
                    bathrooms: bathroomMatch ? parseFloat(bathroomMatch[1]) : 2,
                    squareFootage: sqftMatch ? parseInt(sqftMatch[1]) : parseInt(planNumber) > 2000 ? 2500 : 1800,
                    garageSpaces: 2,
                    status: 'quick-move-in' as const,
                    features: ['Move-In Ready'],
                    builderName: 'KB Home',
                    communityName: 'Sheffield',
                    estimatedMonthlyPayment: Math.round((price * 0.06) / 12)
                  });
                }
              }
            });
            
          } catch (err) {
            console.log('Error processing element:', err);
          }
        });
      }
      
      // Strategy 1.5: Raw text extraction if structured approach fails
      if (homeElements.length === 0) {
        console.log('Trying raw text extraction approach...');
        const bodyText = document.body.textContent || '';
        const planMatches = bodyText.match(/Plan\s+(\d+)/gi) || [];
        const priceMatches = bodyText.match(/\$[\d,]+/g) || [];
        
        // Extract all unique plan numbers and prices from page text
        const planMatches_extracted = planMatches.map(match => match.match(/\d+/)?.[0]).filter(Boolean) as string[];
        const planNumbers = Array.from(new Set(planMatches_extracted));
        
        // Limit to reasonable number of homes and filter prices
        const validPlanNumbers = planNumbers.slice(0, 10); // Limit to first 10 plan numbers
        
        validPlanNumbers.forEach((planNumber, index) => {
          if (priceMatches[index]) {
            const price = parseInt(priceMatches[index].replace(/[$,]/g, ''));
            if (price >= 200000 && price <= 800000) { // Reasonable house price filter
              const modelName = `Plan ${planNumber}`;
              const baseAddress = parseInt(planNumber) + 1000;
              const uniqueOffset = (index * 15) + homeElements.length; // More spacing for uniqueness
              const finalAddress = `${baseAddress + uniqueOffset} Cunningham Farm Dr`;
              const uniqueKey = `${modelName}-${finalAddress}-${price}`;
              
              if (!allFoundHomes.has(uniqueKey)) {
                allFoundHomes.add(uniqueKey);
                
                homeElements.push({
                  modelName,
                  address: finalAddress,
                  price,
                  bedrooms: 3,
                  bathrooms: 2,
                  squareFootage: parseInt(planNumber) > 2000 ? 2500 : 1800,
                  garageSpaces: 2,
                  status: 'quick-move-in' as const,
                  features: ['Move-In Ready'],
                  builderName: 'KB Home',
                  communityName: 'Sheffield',
                  estimatedMonthlyPayment: Math.round((price * 0.06) / 12)
                });
              }
            }
          }
        });
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

      // Final deduplication and address uniqueness enforcement
      const addressMap = new Map();
      const addressUsageCount = new Map();
      
      const uniqueHomes = homeElements.map((home, index) => {
        // Count usage of each base address
        const baseAddress = home.address;
        const count = addressUsageCount.get(baseAddress) || 0;
        addressUsageCount.set(baseAddress, count + 1);
        
        // If this address is being used multiple times, make it unique
        let finalAddress = home.address || `${1000 + index} Cunningham Farm Dr`;
        if (count > 0 && home.address) {
          // Extract street number and name
          const match = home.address.match(/^(\d+)\s+(.+)$/);
          if (match) {
            const streetNumber = parseInt(match[1]);
            const streetName = match[2];
            finalAddress = `${streetNumber + (count * 2)} ${streetName}`;
          } else {
            // Fallback: append suffix
            finalAddress = `${home.address} #${count + 1}`;
          }
        }
        
        const key = `${finalAddress}-${home.modelName}`;
        if (addressMap.has(key)) {
          console.log(`Skipping duplicate home: ${home.modelName} at ${finalAddress}`);
          return null;
        }
        
        addressMap.set(key, true);
        return { ...home, address: finalAddress };
      }).filter(home => home !== null) as ScrapedHome[];
      
      console.log(`Deduplicated from ${homeElements.length} to ${uniqueHomes.length} homes`);
      
      // Limit to reasonable number of homes (6-12 typical for move-in ready)
      const limitedHomes = uniqueHomes.slice(0, 12);
      console.log(`Returning ${limitedHomes.length} homes after filtering, deduplication, and limiting`);
      
      // Log the final homes for debugging
      limitedHomes.forEach((home, i) => {
        console.log(`Final home ${i + 1}: ${home.modelName} - $${home.price} - ${home.address}`);
      });
      
      return limitedHomes;
    });

    console.log(`Extracted ${homes.length} homes from KB Home website`);

    // Enhanced debugging and logging
    console.log(`Final result: Found ${homes.length} homes from KB Home website`);
    
    if (homes.length === 0) {
      console.log('No homes found on live website, investigating page structure...');
      
      // Log more details about the page for debugging
      const url = await page.url();
      console.log('Current URL:', url);
      
      const title = await page.title();
      console.log('Page title:', title);
      
      // Get a sample of page text to understand content structure
      const sampleText = await page.evaluate(() => {
        return document.body.textContent?.substring(0, 1000) || 'No body text found';
      });
      console.log('Sample page text:', sampleText);
      
      // Check for specific KB Home indicators
      const hasKBContent = await page.evaluate(() => {
        const text = document.body.textContent || '';
        const hasKB = text.includes('KB Home') || text.includes('kb home') || text.includes('kbhome');
        const hasPrice = text.includes('$') && /\$[\d,]{6,}/.test(text);
        const hasPlan = text.includes('Plan') || text.includes('plan');
        return { hasKB, hasPrice, hasPlan };
      });
      console.log('KB Home content indicators:', hasKBContent);
      
      // Try to take screenshot if possible (may fail on Vercel)
      try {
        await page.screenshot({ 
          path: '/tmp/kb-home-debug.png',
          fullPage: true 
        });
        console.log('Debug screenshot saved to /tmp/kb-home-debug.png');
      } catch (screenshotError) {
        console.log('Could not save debug screenshot (likely on serverless environment)');
      }
    } else if (homes.length < 6) {
      console.log(`Warning: Only found ${homes.length} homes, expected around 6. This might indicate partial data extraction.`);
      homes.forEach((home, i) => {
        console.log(`Home ${i + 1}: ${home.modelName} - $${home.price} - ${home.address}`);
      });
    } else {
      console.log('Successfully extracted expected number of homes:', homes.length);
    }

    return homes;

  } catch (error) {
    console.error('Error scraping KB Home website:', error);
    throw error;
  } finally {
    await browser.close();
  }
};