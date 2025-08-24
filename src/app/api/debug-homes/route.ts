import { NextRequest, NextResponse } from 'next/server';
import { getHomes } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const homes = await getHomes();
    
    // Group homes by builder and address to identify duplicates
    const homesByBuilder = homes.reduce((acc, home) => {
      if (!acc[home.builder?.name || 'Unknown']) {
        acc[home.builder?.name || 'Unknown'] = {};
      }
      
      const builderHomes = acc[home.builder?.name || 'Unknown'];
      const address = home.address || 'No Address';
      
      if (!builderHomes[address]) {
        builderHomes[address] = [];
      }
      builderHomes[address].push({
        id: home.id,
        modelName: home.modelName,
        price: home.price,
        address: home.address
      });
      
      return acc;
    }, {} as Record<string, Record<string, any[]>>);
    
    // Identify duplicates
    const duplicates: Record<string, any[]> = {};
    Object.entries(homesByBuilder).forEach(([builder, addresses]) => {
      Object.entries(addresses).forEach(([address, homes]) => {
        if (homes.length > 1) {
          duplicates[`${builder} - ${address}`] = homes;
        }
      });
    });
    
    return NextResponse.json({
      totalHomes: homes.length,
      homesByBuilder,
      duplicates,
      duplicateCount: Object.keys(duplicates).length
    });
  } catch (error) {
    console.error('Error fetching homes debug info:', error);
    return NextResponse.json({ error: 'Failed to fetch homes debug info' }, { status: 500 });
  }
}