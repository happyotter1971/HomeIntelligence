import { collection, query, where, getDocs, deleteDoc, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Timestamp } from 'firebase/firestore';
import { scrapeAllBuilders } from './web-scraper';
import { getBuilders, getCommunities, getHomes, logPriceChange, initializePriceHistory } from './firestore';
import { clearAllHomes } from './clear-database';
import { Home } from '@/types';

export const refreshHomesFromWebsites = async () => {
  try {
    console.log('Starting homes refresh from builder websites...');
    
    // Get existing builders and communities
    const builders = await getBuilders();
    const communities = await getCommunities();
    
    // Create mapping objects
    const builderMap = builders.reduce((acc, builder) => {
      acc[builder.name] = builder.id;
      return acc;
    }, {} as Record<string, string>);
    
    const communityMap = communities.reduce((acc, community) => {
      acc[community.name] = community.id;
      return acc;
    }, {} as Record<string, string>);
    
    // Delete existing homes using the clear function
    console.log('Clearing existing home data...');
    await clearAllHomes();
    
    // Scrape fresh data
    console.log('Scraping fresh data from websites...');
    const scrapedHomes = await scrapeAllBuilders();
    
    // Convert to database format
    const homesToAdd = scrapedHomes.map(scrapedHome => ({
      builderId: builderMap[scrapedHome.builderName],
      communityId: communityMap[scrapedHome.communityName],
      modelName: scrapedHome.modelName,
      price: scrapedHome.price,
      bedrooms: scrapedHome.bedrooms,
      bathrooms: scrapedHome.bathrooms,
      squareFootage: scrapedHome.squareFootage,
      garageSpaces: scrapedHome.garageSpaces,
      status: scrapedHome.status,
      features: scrapedHome.features,
      estimatedMonthlyPayment: scrapedHome.estimatedMonthlyPayment,
      lastUpdated: Timestamp.now(),
      createdAt: Timestamp.now()
    }));
    
    // Add fresh homes
    console.log(`Adding ${homesToAdd.length} fresh homes to database...`);
    for (const home of homesToAdd) {
      await addDoc(collection(db, 'homes'), home);
    }
    
    console.log('Homes refresh completed successfully!');
    return {
      homesUpdated: homesToAdd.length,
      lastRefresh: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error refreshing homes from websites:', error);
    throw error;
  }
};

export const refreshHomesWithPriceTracking = async () => {
  try {
    console.log('Starting homes refresh with price change tracking...');
    
    // Get existing data
    const builders = await getBuilders();
    const communities = await getCommunities();
    const existingHomes = await getHomes();
    
    // Create mapping objects
    const builderMap = builders.reduce((acc, builder) => {
      acc[builder.name] = builder.id;
      return acc;
    }, {} as Record<string, string>);
    
    const communityMap = communities.reduce((acc, community) => {
      acc[community.name] = community.id;
      return acc;
    }, {} as Record<string, string>);
    
    // Scrape fresh data
    console.log('Scraping fresh data from websites...');
    const scrapedHomes = await scrapeAllBuilders();
    
    // Process scraped data
    let homesAdded = 0;
    let homesUpdated = 0;
    let priceChangesLogged = 0;
    
    for (const scrapedHome of scrapedHomes) {
      const builderId = builderMap[scrapedHome.builderName];
      const communityId = communityMap[scrapedHome.communityName];
      
      if (!builderId || !communityId) {
        console.warn(`Skipping home - missing builder or community mapping: ${scrapedHome.builderName} - ${scrapedHome.communityName}`);
        continue;
      }
      
      // Try to find existing home by model name, builder, and community
      const existingHome = existingHomes.find(home => 
        home.modelName === scrapedHome.modelName &&
        home.builderId === builderId &&
        home.communityId === communityId &&
        (home.address === scrapedHome.address || 
         home.homesiteNumber === scrapedHome.homesiteNumber)
      );
      
      // Clean data - remove undefined values that Firestore doesn't accept
      const homeData: any = {
        builderId,
        communityId,
        modelName: scrapedHome.modelName,
        price: scrapedHome.price,
        bedrooms: scrapedHome.bedrooms,
        bathrooms: scrapedHome.bathrooms,
        squareFootage: scrapedHome.squareFootage,
        garageSpaces: scrapedHome.garageSpaces,
        status: scrapedHome.status,
        features: scrapedHome.features || [],
        lastUpdated: Timestamp.now()
      };

      // Only add optional fields if they have values
      if (scrapedHome.address) {
        homeData.address = scrapedHome.address;
      }
      if (scrapedHome.homesiteNumber) {
        homeData.homesiteNumber = scrapedHome.homesiteNumber;
      }
      if (scrapedHome.estimatedMonthlyPayment) {
        homeData.estimatedMonthlyPayment = scrapedHome.estimatedMonthlyPayment;
      }
      
      if (existingHome) {
        // Check for price change
        if (existingHome.price !== scrapedHome.price) {
          console.log(`Price change detected for ${scrapedHome.modelName} (${existingHome.id}): $${existingHome.price} → $${scrapedHome.price}`);
          
          // Log price change BEFORE updating the home
          await logPriceChange(existingHome, existingHome.price, scrapedHome.price);
          priceChangesLogged++;
          
          // Make sure to update the price in homeData
          homeData.price = scrapedHome.price;
          console.log(`Updating home ${existingHome.id} with new price: $${scrapedHome.price}`);
        }
        
        // Update existing home (including new price if changed)
        await updateDoc(doc(db, 'homes', existingHome.id), homeData);
        homesUpdated++;
        
      } else {
        // Add new home
        const docRef = await addDoc(collection(db, 'homes'), {
          ...homeData,
          createdAt: Timestamp.now()
        });
        
        // Initialize price history for new competitor homes
        const newHome: Home = {
          id: docRef.id,
          ...homeData,
          createdAt: Timestamp.now()
        } as Home;
        
        await initializePriceHistory(newHome);
        homesAdded++;
      }
    }
    
    // Remove homes that no longer exist in scraped data
    const scrapedHomeKeys = new Set(scrapedHomes.map(h => `${h.builderName}-${h.communityName}-${h.modelName}-${h.address || h.homesiteNumber}`));
    let homesRemoved = 0;
    
    for (const existingHome of existingHomes) {
      const builder = builders.find(b => b.id === existingHome.builderId);
      const community = communities.find(c => c.id === existingHome.communityId);
      
      if (builder && community) {
        const homeKey = `${builder.name}-${community.name}-${existingHome.modelName}-${existingHome.address || existingHome.homesiteNumber}`;
        
        if (!scrapedHomeKeys.has(homeKey)) {
          await deleteDoc(doc(db, 'homes', existingHome.id));
          homesRemoved++;
        }
      }
    }
    
    console.log('Homes refresh with price tracking completed successfully!');
    return {
      homesAdded,
      homesUpdated,
      homesRemoved,
      priceChangesLogged,
      lastRefresh: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error refreshing homes with price tracking:', error);
    throw error;
  }
};