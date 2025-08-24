import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HomeWithRelations } from '@/types';
import { formatPrice, formatSquareFootage } from '@/lib/utils';
import { Bed, Bath, Car, MapPin, Calendar } from 'lucide-react';

interface HomeCardProps {
  home: HomeWithRelations;
  onCompare?: (home: HomeWithRelations) => void;
  isComparing?: boolean;
}

export function HomeCard({ home, onCompare, isComparing = false }: HomeCardProps) {
  const statusColors = {
    available: 'bg-green-100 text-green-800',
    'quick-move-in': 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    sold: 'bg-red-100 text-red-800'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{home.modelName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {home.builder?.name} • {home.community?.name}
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[home.status]}`}>
            {home.status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold text-primary">
          {formatPrice(home.price)}
        </div>
        
        {home.estimatedMonthlyPayment && (
          <div className="text-sm text-muted-foreground">
            Est. {formatPrice(home.estimatedMonthlyPayment)}/month
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>{home.bedrooms} bed</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{home.bathrooms} bath</span>
          </div>
          <div className="flex items-center gap-1">
            <Car className="h-4 w-4" />
            <span>{home.garageSpaces} car</span>
          </div>
        </div>
        
        <div className="text-sm font-medium">
          {formatSquareFootage(home.squareFootage)}
        </div>
        
        {home.address && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{home.address}</span>
          </div>
        )}
        
        {home.homesiteNumber && (
          <div className="text-sm text-muted-foreground">
            Homesite: {home.homesiteNumber}
          </div>
        )}
        
        {home.features.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Features: </span>
            {home.features.slice(0, 3).join(', ')}
            {home.features.length > 3 && '...'}
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" size="sm">
            View Details
          </Button>
          {onCompare && (
            <Button 
              variant={isComparing ? "secondary" : "outline"} 
              size="sm"
              onClick={() => onCompare(home)}
            >
              {isComparing ? 'Remove' : 'Compare'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}