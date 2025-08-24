import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { scrapeAllBuilders } from '@/lib/web-scraper';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting database seeding with scraped data...');
    
    // First scrape all homes data from websites
    const scrapedHomes = await scrapeAllBuilders();
    console.log(`Scraped ${scrapedHomes.length} homes from builder websites`);

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

    const mooreFarmRef = await addDoc(collection(db, 'communities'), {
      builderId: ryanHomesRef.id,
      name: 'Moore Farm',
      location: 'Indian Trail, NC',
      city: 'Indian Trail',
      state: 'NC',
      zipCode: '28079'
    });

    // Map builder names to IDs and community names to IDs
    const builderMap: Record<string, { id: string; communityId: string }> = {
      'Dream Finders Homes': { id: dreamFindersRef.id, communityId: mooreFarmsRef.id },
      'KB Home': { id: kbHomeRef.id, communityId: sheffieldRef.id },
      'Ryan Homes': { id: ryanHomesRef.id, communityId: mooreFarmRef.id }
    };

    // Add scraped homes to database
    let addedHomes = 0;
    for (const home of scrapedHomes) {
      const builderInfo = builderMap[home.builderName];
      if (!builderInfo) {
        console.warn(`No builder mapping found for: ${home.builderName}`);
        continue;
      }

      try {
        await addDoc(collection(db, 'homes'), {
          builderId: builderInfo.id,
          communityId: builderInfo.communityId,
          modelName: home.modelName,
          address: home.address,
          homesiteNumber: home.homesiteNumber,
          price: home.price,
          bedrooms: home.bedrooms,
          bathrooms: home.bathrooms,
          squareFootage: home.squareFootage,
          garageSpaces: home.garageSpaces,
          lotSize: home.lotSize,
          status: home.status,
          features: home.features || [],
          images: home.images || [],
          estimatedMonthlyPayment: home.estimatedMonthlyPayment,
          lastUpdated: Timestamp.now(),
          createdAt: Timestamp.now()
        });
        addedHomes++;
      } catch (homeError) {
        console.error(`Error adding home ${home.modelName}:`, homeError);
      }
    }

    return NextResponse.json({
      success: true,
      builders: 3,
      communities: 3,
      homes: addedHomes,
      message: `Successfully seeded database with ${addedHomes} homes from live websites`
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}