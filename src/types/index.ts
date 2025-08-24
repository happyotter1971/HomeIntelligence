import { Timestamp } from "firebase/firestore";

export interface Builder {
  id: string;
  name: string;
  website: string;
  primaryColor: string;
  logo?: string;
}

export interface Community {
  id: string;
  builderId: string;
  name: string;
  location: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Home {
  id: string;
  builderId: string;
  communityId: string;
  modelName: string;
  address?: string;
  homesiteNumber?: string;
  price: number;
  priceRange?: {
    min: number;
    max: number;
  };
  bedrooms: number;
  bathrooms: number;
  halfBaths?: number;
  squareFootage: number;
  garageSpaces: number;
  lotSize?: number;
  status: "available" | "sold" | "pending" | "quick-move-in";
  features: string[];
  images?: string[];
  floorPlan?: string;
  estimatedMonthlyPayment?: number;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: "admin" | "user";
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export interface HomeWithRelations extends Home {
  builder?: Builder;
  community?: Community;
}

export interface PriceChange {
  id: string;
  homeId: string;
  builderId: string;
  communityId: string;
  modelName: string;
  address?: string;
  homesiteNumber?: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;  // newPrice - oldPrice
  changePercentage: number;  // (changeAmount / oldPrice) * 100
  oldPriceDate: Timestamp;  // When the old price was first set
  changeDate: Timestamp;    // When the price actually changed
  changeType: 'increase' | 'decrease';
  daysSinceLastChange?: number;  // How long the old price was active
}

export interface PriceChangeWithRelations extends PriceChange {
  builder?: Builder;
  community?: Community;
}

export interface PriceHistory {
  id: string;
  homeId: string;
  builderId: string;
  communityId: string;
  modelName: string;
  address?: string;
  homesiteNumber?: string;
  price: number;
  priceStartDate: Timestamp;  // When this price became active
  priceEndDate?: Timestamp;   // When this price was changed (undefined if current price)
  daysActive?: number;        // How many days this price was/has been active
  isCurrentPrice: boolean;    // Whether this is the current price
}

export interface PriceHistoryWithRelations extends PriceHistory {
  builder?: Builder;
  community?: Community;
}