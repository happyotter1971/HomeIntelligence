import { HomeWithRelations } from '@/types';
import { getHomes } from '@/lib/firestore';

export interface ComparableCriteria {
  city: string;
  zipCode: string;
  bedrooms: number;
  squareFeet: number;
  excludeId: string;
}

export async function findComparableHomes(
  criteria: ComparableCriteria,
  limit: number = 10
): Promise<HomeWithRelations[]> {
  // Get all homes from the database
  const allHomes = await getHomes();
  
  // Filter for comparables
  const comparables = allHomes
    .filter(home => {
      // Exclude the subject home
      if (home.id === criteria.excludeId) return false;
      
      // Same city and zip
      if (home.community?.city !== criteria.city || home.community?.zipCode !== criteria.zipCode) {
        // Allow nearby zips in Indian Trail area
        const nearbyZips = ['28079', '28104', '28110'];
        if (!nearbyZips.includes(home.community?.zipCode || '')) {
          return false;
        }
      }
      
      // Beds within ±1
      const bedDiff = Math.abs(home.bedrooms - criteria.bedrooms);
      if (bedDiff > 1) return false;
      
      // Square feet within ±15%
      const sqftDiff = Math.abs(home.squareFootage - criteria.squareFeet) / criteria.squareFeet;
      if (sqftDiff > 0.15) return false;
      
      // Prefer spec and quick-move-in homes
      const preferredStatuses = ['spec', 'quick-move-in', 'available', 'pending', 'sold'];
      if (!preferredStatuses.includes(home.status || '')) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Prioritize by status (sold/pending > available > spec)
      const statusOrder = { 'sold': 0, 'pending': 1, 'available': 2, 'spec': 3, 'quick-move-in': 4 };
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 5;
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 5;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Then by price per sqft similarity
      const aPpsf = a.price / a.squareFootage;
      const bPpsf = b.price / b.squareFootage;
      const targetPpsf = criteria.squareFeet > 0 ? criteria.squareFeet : 200; // Estimate
      
      return Math.abs(aPpsf - targetPpsf) - Math.abs(bPpsf - targetPpsf);
    })
    .slice(0, limit);
  
  return comparables;
}