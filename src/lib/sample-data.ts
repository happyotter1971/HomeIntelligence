import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Timestamp } from 'firebase/firestore';
import { scrapeAllBuilders } from './web-scraper';

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding with scraped data...');
    
    // First scrape all homes data from websites
    const scrapedHomes = await scrapeAllBuilders();
    console.log(`Scraped ${scrapedHomes.length} homes from builder websites`);
    console.log('Scraped homes breakdown:', scrapedHomes.map(h => `${h.builderName} - ${h.modelName}`));

    // Add Builders
    const dreamFindersRef = await addDoc(collection(db, 'builders'), {
      name: 'Dream Finders Homes',
      website: 'https://dreamfindershomes.com',
      primaryColor: '#2563eb'
    });

    const kbHomeRef = await addDoc(collection(db, 'builders'), {
      name: 'KB Home',
      website: 'https://kbhome.com',
      primaryColor: '#16a34a'
    });

    const ryanHomesRef = await addDoc(collection(db, 'builders'), {
      name: 'Ryan Homes',
      website: 'https://ryanhomes.com',
      primaryColor: '#9333ea'
    });

    // Add Communities
    const mooreFarmsRef = await addDoc(collection(db, 'communities'), {
      builderId: dreamFindersRef.id,
      name: 'Moore Farms',
      location: 'Indian Trail, NC',
      city: 'Indian Trail',
      state: 'NC',
      zipCode: '28079'
    });

    const sheffieldRef = await addDoc(collection(db, 'communities'), {
      builderId: kbHomeRef.id,
      name: 'Sheffield',
      location: 'Charlotte Area, NC',
      city: 'Charlotte',
      state: 'NC',
      zipCode: '28105'
    });

    const mooreFarmRyanRef = await addDoc(collection(db, 'communities'), {
      builderId: ryanHomesRef.id,
      name: 'Moore Farm',
      location: 'Indian Trail, NC',
      city: 'Indian Trail',
      state: 'NC',
      zipCode: '28079'
    });

    // Create builder and community mapping
    const builderMap = {
      'Dream Finders Homes': dreamFindersRef.id,
      'KB Home': kbHomeRef.id,
      'Ryan Homes': ryanHomesRef.id
    };

    const communityMap = {
      'Moore Farms': mooreFarmsRef.id,
      'Sheffield': sheffieldRef.id,
      'Moore Farm': mooreFarmRyanRef.id
    };

    // Convert scraped homes to database format
    const homesToAdd = scrapedHomes.map(scrapedHome => {
      const builderId = builderMap[scrapedHome.builderName as keyof typeof builderMap];
      const communityId = communityMap[scrapedHome.communityName as keyof typeof communityMap];
      
      if (!builderId) {
        console.error(`Missing builderId for builder: ${scrapedHome.builderName}`);
      }
      if (!communityId) {
        console.error(`Missing communityId for community: ${scrapedHome.communityName}`);
      }
      
      return {
        builderId,
        communityId,
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
      };
    }).filter(home => home.builderId && home.communityId); // Filter out homes with missing IDs

    // Add all homes to Firestore
    console.log(`Adding ${homesToAdd.length} homes to database...`);
    for (const home of homesToAdd) {
      await addDoc(collection(db, 'homes'), home);
    }

    console.log('Scraped data added successfully!');
    return {
      builders: 3,
      communities: 3,
      homes: homesToAdd.length
    };
  } catch (error) {
    console.error('Error adding scraped data:', error);
    throw error;
  }
};