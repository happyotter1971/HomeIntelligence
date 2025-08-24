import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Timestamp } from 'firebase/firestore';

export const seedDatabase = async () => {
  try {
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

    // Dream Finders Homes - Moore Farms
    const dreamFinderHomes = [
      {
        builderId: dreamFindersRef.id,
        communityId: mooreFarmsRef.id,
        modelName: 'Liberty',
        price: 499900,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFootage: 2320,
        garageSpaces: 2,
        status: 'available',
        features: ['Open Floor Plan', 'Main Level Owner Suite', 'Granite Countertops'],
        homesiteNumber: '45',
        estimatedMonthlyPayment: 3200,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: dreamFindersRef.id,
        communityId: mooreFarmsRef.id,
        modelName: 'Bellwood',
        price: 549900,
        bedrooms: 4,
        bathrooms: 3,
        squareFootage: 2680,
        garageSpaces: 2,
        status: 'quick-move-in',
        features: ['Two-Story', 'Bonus Room', 'Walk-in Pantry', 'Covered Porch'],
        homesiteNumber: '52',
        estimatedMonthlyPayment: 3500,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: dreamFindersRef.id,
        communityId: mooreFarmsRef.id,
        modelName: 'Charleston',
        price: 596265,
        bedrooms: 5,
        bathrooms: 3,
        squareFootage: 3305,
        garageSpaces: 2,
        status: 'available',
        features: ['Five Bedrooms', 'Formal Dining', 'Study', 'Three-Car Garage Option'],
        homesiteNumber: '67',
        estimatedMonthlyPayment: 3800,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      }
    ];

    // KB Home - Sheffield
    const kbHomes = [
      {
        builderId: kbHomeRef.id,
        communityId: sheffieldRef.id,
        modelName: 'Plan 1820',
        price: 355990,
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1820,
        garageSpaces: 2,
        status: 'available',
        features: ['Single Story', 'Open Concept', 'Kitchen Island'],
        estimatedMonthlyPayment: 2400,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: kbHomeRef.id,
        communityId: sheffieldRef.id,
        modelName: 'Plan 2156',
        price: 389990,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFootage: 2156,
        garageSpaces: 2,
        status: 'quick-move-in',
        features: ['Two Story', 'Loft', 'Walk-in Closets'],
        estimatedMonthlyPayment: 2650,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: kbHomeRef.id,
        communityId: sheffieldRef.id,
        modelName: 'Plan 2486',
        price: 429990,
        bedrooms: 4,
        bathrooms: 3,
        squareFootage: 2486,
        garageSpaces: 2,
        status: 'available',
        features: ['Master Suite Downstairs', 'Game Room', 'Covered Patio'],
        estimatedMonthlyPayment: 2900,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      }
    ];

    // Ryan Homes - Moore Farm
    const ryanHomes = [
      {
        builderId: ryanHomesRef.id,
        communityId: mooreFarmRyanRef.id,
        modelName: 'Palladio Ranch',
        price: 459990,
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1898,
        garageSpaces: 2,
        status: 'available',
        features: ['Single Story', 'Main-Level Owner Suite', 'Open Floor Plan'],
        estimatedMonthlyPayment: 3100,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: ryanHomesRef.id,
        communityId: mooreFarmRyanRef.id,
        modelName: 'Columbia',
        price: 459990,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFootage: 2423,
        garageSpaces: 2,
        status: 'available',
        features: ['Two Story', 'Owner Suite on Main', 'Morning Room'],
        estimatedMonthlyPayment: 3100,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: ryanHomesRef.id,
        communityId: mooreFarmRyanRef.id,
        modelName: 'Hudson',
        price: 484990,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFootage: 2718,
        garageSpaces: 2,
        status: 'quick-move-in',
        features: ['Four+ Bedrooms', 'Bonus Room', 'Covered Deck'],
        estimatedMonthlyPayment: 3300,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: ryanHomesRef.id,
        communityId: mooreFarmRyanRef.id,
        modelName: 'Palladio 2-Story',
        price: 494990,
        bedrooms: 3,
        bathrooms: 2.5,
        squareFootage: 2626,
        garageSpaces: 2,
        status: 'available',
        features: ['Two Story', 'Flex Room', 'Walk-in Pantry'],
        estimatedMonthlyPayment: 3400,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: ryanHomesRef.id,
        communityId: mooreFarmRyanRef.id,
        modelName: 'Lehigh',
        price: 524990,
        bedrooms: 4,
        bathrooms: 3,
        squareFootage: 3010,
        garageSpaces: 2,
        status: 'available',
        features: ['Four+ Bedrooms', 'Study', 'Owner Suite on Main'],
        estimatedMonthlyPayment: 3600,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      },
      {
        builderId: ryanHomesRef.id,
        communityId: mooreFarmRyanRef.id,
        modelName: 'York',
        price: 561990,
        bedrooms: 4,
        bathrooms: 3.5,
        squareFootage: 3656,
        garageSpaces: 2,
        status: 'available',
        features: ['Four+ Bedrooms', 'Study', 'Game Room', 'Three-Car Garage Option'],
        estimatedMonthlyPayment: 3900,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      }
    ];

    // Add all homes to Firestore
    const allHomes = [...dreamFinderHomes, ...kbHomes, ...ryanHomes];
    
    for (const home of allHomes) {
      await addDoc(collection(db, 'homes'), home);
    }

    console.log('Sample data added successfully!');
    return {
      builders: 3,
      communities: 3,
      homes: allHomes.length
    };
  } catch (error) {
    console.error('Error adding sample data:', error);
    throw error;
  }
};