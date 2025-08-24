import { collection, query, where, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Timestamp } from 'firebase/firestore';
import { scrapeAllBuilders } from './web-scraper';
import { getBuilders, getCommunities } from './firestore';
import { clearAllHomes } from './clear-database';

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