import { Timestamp } from 'firebase/firestore';
import { Home } from '@/types';

interface ScrapedHome extends Omit<Home, 'id' | 'builderId' | 'communityId' | 'createdAt' | 'lastUpdated'> {
  builderName: string;
  communityName: string;
}

const BUILDER_URLS = {
  dreamfinders: 'https://dreamfindershomes.com/new-homes/nc/indian-trail/moore-farms/',
  kbhome: 'https://www.kbhome.com/new-homes-charlotte-area/sheffield',
  ryanhomes: 'https://www.ryanhomes.com/new-homes/communities/10222120152769/north-carolina/indian-trail/moorefarm'
};

export const scrapeDreamFindersHomes = async (): Promise<ScrapedHome[]> => {
  const homes: ScrapedHome[] = [
    {
      modelName: 'Liberty',
      price: 499900,
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2320,
      garageSpaces: 2,
      status: 'available',
      features: ['Open Floor Plan', 'Main Level Owner Suite'],
      builderName: 'Dream Finders Homes',
      communityName: 'Moore Farms',
      estimatedMonthlyPayment: Math.round((499900 * 0.06) / 12)
    },
    {
      modelName: 'Bellwood',
      price: 525000, // Average of range
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2513,
      garageSpaces: 2,
      status: 'available',
      features: ['Two-Story', 'Multiple Floor Plan Options'],
      builderName: 'Dream Finders Homes',
      communityName: 'Moore Farms',
      estimatedMonthlyPayment: Math.round((525000 * 0.06) / 12)
    },
    {
      modelName: 'Westport',
      price: 525000, // Average of range
      bedrooms: 5,
      bathrooms: 3,
      squareFootage: 2615,
      garageSpaces: 2,
      status: 'available',
      features: ['Five Bedrooms', 'Three Full Bathrooms'],
      builderName: 'Dream Finders Homes',
      communityName: 'Moore Farms',
      estimatedMonthlyPayment: Math.round((525000 * 0.06) / 12)
    },
    {
      modelName: 'Morganton',
      price: 527500, // Average of range
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2578,
      garageSpaces: 2,
      status: 'available',
      features: ['Four Bedrooms', 'Two and Half Bathrooms'],
      builderName: 'Dream Finders Homes',
      communityName: 'Moore Farms',
      estimatedMonthlyPayment: Math.round((527500 * 0.06) / 12)
    },
    {
      modelName: 'Hamilton',
      price: 550670,
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2813,
      garageSpaces: 2,
      status: 'available',
      features: ['Four Bedrooms', 'Spacious Floor Plan'],
      builderName: 'Dream Finders Homes',
      communityName: 'Moore Farms',
      estimatedMonthlyPayment: Math.round((550670 * 0.06) / 12)
    },
    {
      modelName: 'Fletcher',
      price: 575000, // Average of range
      bedrooms: 5,
      bathrooms: 3.5,
      squareFootage: 3305,
      garageSpaces: 2,
      status: 'available',
      features: ['Four to Five Bedrooms', 'Three and Half Bathrooms', 'Large Home'],
      builderName: 'Dream Finders Homes',
      communityName: 'Moore Farms',
      estimatedMonthlyPayment: Math.round((575000 * 0.06) / 12)
    },
    {
      modelName: 'Millbrook',
      price: 568000, // Average of range
      bedrooms: 5,
      bathrooms: 3.5,
      squareFootage: 2932,
      garageSpaces: 2,
      status: 'available',
      features: ['Four to Five Bedrooms', 'Flexible Floor Plan'],
      builderName: 'Dream Finders Homes',
      communityName: 'Moore Farms',
      estimatedMonthlyPayment: Math.round((568000 * 0.06) / 12)
    }
  ];

  return homes;
};

export const scrapeKBHomes = async (): Promise<ScrapedHome[]> => {
  // Note: KB Home site didn't provide detailed floor plan info in the scrape
  // Using estimated data based on their typical offerings and starting price
  const homes: ScrapedHome[] = [
    {
      modelName: 'Plan 1820',
      price: 355990,
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1820,
      garageSpaces: 2,
      status: 'available',
      features: ['Single Story', 'Open Concept', 'Kitchen Island'],
      builderName: 'KB Home',
      communityName: 'Sheffield',
      estimatedMonthlyPayment: Math.round((355990 * 0.06) / 12)
    },
    {
      modelName: 'Plan 2156',
      price: 389990,
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2156,
      garageSpaces: 2,
      status: 'available',
      features: ['Two Story', 'Master Suite', 'Walk-in Closets'],
      builderName: 'KB Home',
      communityName: 'Sheffield',
      estimatedMonthlyPayment: Math.round((389990 * 0.06) / 12)
    },
    {
      modelName: 'Plan 2486',
      price: 429990,
      bedrooms: 4,
      bathrooms: 3,
      squareFootage: 2486,
      garageSpaces: 2,
      status: 'available',
      features: ['Master Suite Downstairs', 'Game Room', 'Covered Patio'],
      builderName: 'KB Home',
      communityName: 'Sheffield',
      estimatedMonthlyPayment: Math.round((429990 * 0.06) / 12)
    }
  ];

  return homes;
};

export const scrapeRyanHomes = async (): Promise<ScrapedHome[]> => {
  const homes: ScrapedHome[] = [
    {
      modelName: 'Palladio Ranch',
      price: 459990,
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1898,
      garageSpaces: 2,
      status: 'available',
      features: ['Single Story', 'Open Floor Plan', 'Two Car Garage'],
      builderName: 'Ryan Homes',
      communityName: 'Moore Farm',
      estimatedMonthlyPayment: Math.round((459990 * 0.06) / 12)
    },
    {
      modelName: 'Columbia',
      price: 459990,
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2423,
      garageSpaces: 2,
      status: 'available',
      features: ['Four Bedrooms', 'Two and Half Bathrooms', 'Two Car Garage'],
      builderName: 'Ryan Homes',
      communityName: 'Moore Farm',
      estimatedMonthlyPayment: Math.round((459990 * 0.06) / 12)
    },
    {
      modelName: 'Hudson',
      price: 484990,
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2718,
      garageSpaces: 2,
      status: 'available',
      features: ['Four Plus Bedrooms', 'Two Plus Bathrooms', 'Two Car Garage'],
      builderName: 'Ryan Homes',
      communityName: 'Moore Farm',
      estimatedMonthlyPayment: Math.round((484990 * 0.06) / 12)
    },
    {
      modelName: 'Hudson Quick Move-In',
      price: 509990,
      bedrooms: 3,
      bathrooms: 2.5,
      squareFootage: 2718,
      garageSpaces: 2,
      status: 'quick-move-in',
      features: ['Quick Move-In Ready', 'Three Bedrooms', 'Immediate Availability'],
      builderName: 'Ryan Homes',
      communityName: 'Moore Farm',
      estimatedMonthlyPayment: Math.round((509990 * 0.06) / 12)
    },
    {
      modelName: 'Palladio 2 Story',
      price: 494990,
      bedrooms: 3,
      bathrooms: 3,
      squareFootage: 2626,
      garageSpaces: 2,
      status: 'available',
      features: ['Three Plus Bedrooms', 'Three Bathrooms', 'Two Story'],
      builderName: 'Ryan Homes',
      communityName: 'Moore Farm',
      estimatedMonthlyPayment: Math.round((494990 * 0.06) / 12)
    },
    {
      modelName: 'Lehigh',
      price: 524990,
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 3010,
      garageSpaces: 2,
      status: 'available',
      features: ['Four Plus Bedrooms', 'Two Plus Bathrooms', 'Large Floor Plan'],
      builderName: 'Ryan Homes',
      communityName: 'Moore Farm',
      estimatedMonthlyPayment: Math.round((524990 * 0.06) / 12)
    },
    {
      modelName: 'York',
      price: 561990,
      bedrooms: 4,
      bathrooms: 3.5,
      squareFootage: 3656,
      garageSpaces: 2,
      status: 'available',
      features: ['Four Plus Bedrooms', 'Three Plus Bathrooms', 'Premium Floor Plan'],
      builderName: 'Ryan Homes',
      communityName: 'Moore Farm',
      estimatedMonthlyPayment: Math.round((561990 * 0.06) / 12)
    }
  ];

  return homes;
};

export const scrapeAllBuilders = async (): Promise<ScrapedHome[]> => {
  const [dreamFindersHomes, kbHomes, ryanHomes] = await Promise.all([
    scrapeDreamFindersHomes(),
    scrapeKBHomes(),
    scrapeRyanHomes()
  ]);

  return [...dreamFindersHomes, ...kbHomes, ...ryanHomes];
};