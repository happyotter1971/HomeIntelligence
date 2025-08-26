// Geographic utilities for distance calculation and location services

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationData {
  coordinates?: Coordinates;
  city?: string;
  zipCode?: string;
  community?: string;
}

// Haversine formula for calculating distance between two coordinates
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Known coordinates for common areas in the region
const KNOWN_LOCATIONS: { [key: string]: Coordinates } = {
  'indian_trail': { lat: 35.0793, lng: -80.6434 },
  'charlotte': { lat: 35.2271, lng: -80.8431 },
  'matthews': { lat: 35.1168, lng: -80.7239 },
  'mint_hill': { lat: 35.1801, lng: -80.6587 },
  'stallings': { lat: 35.0968, lng: -80.6857 },
  'weddington': { lat: 35.0332, lng: -80.7609 },
  'waxhaw': { lat: 34.9243, lng: -80.7434 },
  'wesley_chapel': { lat: 35.0582, lng: -80.6390 }
};

// ZIP code to coordinates mapping for the region
const ZIP_COORDINATES: { [zipCode: string]: Coordinates } = {
  '28079': { lat: 35.0793, lng: -80.6434 }, // Indian Trail
  '28104': { lat: 35.1168, lng: -80.7239 }, // Matthews
  '28110': { lat: 35.1801, lng: -80.6587 }, // Mint Hill
  '28078': { lat: 35.0968, lng: -80.6857 }, // Stallings
  '28173': { lat: 35.0332, lng: -80.7609 }, // Weddington/Waxhaw area
  '28105': { lat: 35.0582, lng: -80.6390 }, // Wesley Chapel
  '28227': { lat: 35.1951, lng: -80.7434 }  // Charlotte (Matthews area)
};

export function getCoordinates(location: LocationData): Coordinates | null {
  // Try to get coordinates from the location data directly
  if (location.coordinates) {
    return location.coordinates;
  }
  
  // Try to get coordinates from city name
  if (location.city) {
    const cityKey = location.city.toLowerCase().replace(/\s+/g, '_');
    if (KNOWN_LOCATIONS[cityKey]) {
      return KNOWN_LOCATIONS[cityKey];
    }
  }
  
  // Try to get coordinates from ZIP code
  if (location.zipCode && ZIP_COORDINATES[location.zipCode]) {
    return ZIP_COORDINATES[location.zipCode];
  }
  
  // Try to extract from community name if it contains a known location
  if (location.community) {
    const communityLower = location.community.toLowerCase();
    for (const [locationKey, coords] of Object.entries(KNOWN_LOCATIONS)) {
      if (communityLower.includes(locationKey.replace('_', ' '))) {
        return coords;
      }
    }
  }
  
  return null; // Unable to determine coordinates
}

export function calculateLocationDistance(
  location1: LocationData,
  location2: LocationData
): number | null {
  const coords1 = getCoordinates(location1);
  const coords2 = getCoordinates(location2);
  
  if (!coords1 || !coords2) {
    return null; // Unable to calculate distance
  }
  
  return calculateDistance(coords1, coords2);
}

// Estimate distance based on location similarity when coordinates aren't available
export function estimateDistance(
  location1: LocationData,
  location2: LocationData
): number {
  // Same community = very close
  if (location1.community && location2.community && 
      location1.community === location2.community) {
    return 0.1;
  }
  
  // Same city = close
  if (location1.city && location2.city && 
      location1.city === location2.city) {
    return Math.random() * 3 + 0.5; // 0.5 to 3.5 miles
  }
  
  // Same ZIP = moderately close
  if (location1.zipCode && location2.zipCode && 
      location1.zipCode === location2.zipCode) {
    return Math.random() * 5 + 1; // 1 to 6 miles
  }
  
  // Different areas in the region
  return Math.random() * 15 + 3; // 3 to 18 miles
}

// Get the best available distance between two locations
export function getBestDistance(
  location1: LocationData,
  location2: LocationData
): number {
  const actualDistance = calculateLocationDistance(location1, location2);
  
  if (actualDistance !== null) {
    return actualDistance;
  }
  
  // Fall back to estimation
  return estimateDistance(location1, location2);
}

// Check if two locations are in the same market area
export function isSameMarketArea(
  location1: LocationData,
  location2: LocationData
): boolean {
  // Same community is definitely same market
  if (location1.community && location2.community && 
      location1.community === location2.community) {
    return true;
  }
  
  // Same city is same market
  if (location1.city && location2.city && 
      location1.city === location2.city) {
    return true;
  }
  
  // Nearby ZIP codes are same market
  const nearbyZips = ['28079', '28104', '28110', '28105', '28227', '28078'];
  if (location1.zipCode && location2.zipCode &&
      nearbyZips.includes(location1.zipCode) &&
      nearbyZips.includes(location2.zipCode)) {
    return true;
  }
  
  return false;
}