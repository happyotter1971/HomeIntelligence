import { NextRequest, NextResponse } from 'next/server';
import { getHomes } from '@/lib/firestore';

export async function GET() {
  try {
    const homes = await getHomes();
    
    // Filter KB Home entries
    const kbHomes = homes.filter(home => 
      home.builder?.name === 'KB Home' || 
      home.builderId === 'RFSd8F1PofugKMewuFcy' // Known KB Home ID
    );
    
    return NextResponse.json({
      success: true,
      totalHomes: homes.length,
      kbHomesCount: kbHomes.length,
      kbHomes: kbHomes.map(home => ({
        id: home.id,
        modelName: home.modelName,
        address: home.address,
        price: home.price,
        builderId: home.builderId,
        builderName: home.builder?.name,
        communityId: home.communityId,
        communityName: home.community?.name
      })),
      allBuilders: homes.reduce((acc, home) => {
        if (home.builder?.name && !acc.includes(home.builder.name)) {
          acc.push(home.builder.name);
        }
        return acc;
      }, [] as string[])
    });
  } catch (error) {
    console.error('Error debugging KB homes:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}