import { NextRequest, NextResponse } from 'next/server';
import { getBuilders, getCommunities } from '@/lib/firestore';

export async function GET() {
  try {
    const builders = await getBuilders();
    const communities = await getCommunities();
    
    return NextResponse.json({
      success: true,
      builders: builders.map(b => ({ id: b.id, name: b.name })),
      communities: communities.map(c => ({ id: c.id, name: c.name, builderId: c.builderId })),
      builderMap: builders.reduce((acc, builder) => {
        acc[builder.name] = builder.id;
        return acc;
      }, {} as Record<string, string>),
      communityMap: communities.reduce((acc, community) => {
        acc[community.name] = community.id;
        return acc;
      }, {} as Record<string, string>)
    });
  } catch (error) {
    console.error('Error debugging builders:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}