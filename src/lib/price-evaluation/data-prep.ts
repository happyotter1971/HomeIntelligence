import { HomeWithRelations } from '@/types';
import { SubjectProperty, ComparableProperty } from '@/lib/openai/types';

export function prepareSubjectProperty(home: HomeWithRelations): SubjectProperty {
  return {
    address: home.address || 'Address not available',
    city: home.community?.city || 'Indian Trail',
    county: 'Union', // Indian Trail is in Union County
    zip: home.community?.zipCode || '28079',
    community: home.community?.name || '',
    builder: home.builder?.name || '',
    plan: home.modelName || undefined,
    status: home.status || 'quick-move-in',
    list_price: home.price,
    beds: home.bedrooms,
    baths: home.bathrooms,
    half_baths: home.halfBaths || 0,
    heated_sqft: home.squareFootage,
    garage_spaces: home.garageSpaces || 0,
    lot_size: home.lotSize || undefined,
    year_built: new Date().getFullYear(), // Assuming new construction
    coordinates: [35.08, -80.64], // Indian Trail coordinates (approximate)
    school_district: 'Union County Public Schools',
    commute_pins: [
      { location: 'Uptown Charlotte', distance_miles: 25 },
      { location: 'SouthPark', distance_miles: 20 },
      { location: 'Ballantyne', distance_miles: 15 }
    ]
  };
}

export function prepareComparableProperty(
  home: HomeWithRelations,
  subjectHome: HomeWithRelations
): ComparableProperty {
  const subject = prepareSubjectProperty(home);
  
  // Calculate distance (simplified - would need real coordinates for accuracy)
  const distance = calculateApproximateDistance(
    home.community?.name,
    subjectHome.community?.name
  );
  
  return {
    ...subject,
    distance_miles: distance,
    days_on_market: calculateDaysOnMarket(home),
    pending_flag: home.status === 'pending',
    close_price: home.status === 'sold' ? home.price : undefined
  };
}

function calculateApproximateDistance(
  community1?: string,
  community2?: string
): number {
  // Simplified distance calculation based on community names
  if (!community1 || !community2) return 5.0;
  if (community1 === community2) return 0.1;
  
  // Communities in Indian Trail are typically within 10 miles of each other
  return Math.random() * 5 + 0.5; // Random distance between 0.5 and 5.5 miles
}

function calculateDaysOnMarket(home: HomeWithRelations): number {
  if (home.createdAt) {
    const listDate = home.createdAt.toDate ? home.createdAt.toDate() : new Date(home.createdAt as any);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - listDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 30; // Default estimate
}