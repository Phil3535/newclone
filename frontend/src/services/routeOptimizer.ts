// Route Optimization Service
// Uses nearest neighbor algorithm for appointment route optimization

interface Location {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lon?: number;
}

interface OptimizedRoute {
  locations: Location[];
  totalDistance: number;
  estimatedTime: number; // in minutes
  savings: number; // percentage saved vs original order
}

// Haversine formula to calculate distance between two points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Geocode an address using Nominatim
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SolarEmpireApp/1.0' }
    });
    const data = await response.json();
    
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Calculate total distance of a route
function calculateTotalDistance(locations: Location[]): number {
  let total = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    if (locations[i].lat && locations[i].lon && locations[i + 1].lat && locations[i + 1].lon) {
      total += haversineDistance(
        locations[i].lat!,
        locations[i].lon!,
        locations[i + 1].lat!,
        locations[i + 1].lon!
      );
    }
  }
  return total;
}

// Nearest neighbor algorithm for route optimization
function nearestNeighborOptimization(locations: Location[], startIndex: number = 0): Location[] {
  if (locations.length <= 2) return locations;
  
  const optimized: Location[] = [];
  const remaining = [...locations];
  
  // Start with the first location (or specified start)
  let current = remaining.splice(startIndex, 1)[0];
  optimized.push(current);
  
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      if (current.lat && current.lon && remaining[i].lat && remaining[i].lon) {
        const distance = haversineDistance(
          current.lat,
          current.lon,
          remaining[i].lat!,
          remaining[i].lon!
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
    }
    
    current = remaining.splice(nearestIndex, 1)[0];
    optimized.push(current);
  }
  
  return optimized;
}

export async function optimizeRoute(appointments: { id: string; lead_name: string; lead_address: string }[]): Promise<OptimizedRoute> {
  // Convert appointments to locations with geocoding
  const locations: Location[] = [];
  
  for (const appt of appointments) {
    const coords = await geocodeAddress(appt.lead_address);
    locations.push({
      id: appt.id,
      name: appt.lead_name,
      address: appt.lead_address,
      lat: coords?.lat,
      lon: coords?.lon,
    });
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Calculate original distance
  const originalDistance = calculateTotalDistance(locations);
  
  // Optimize the route
  const optimizedLocations = nearestNeighborOptimization(locations);
  const optimizedDistance = calculateTotalDistance(optimizedLocations);
  
  // Calculate savings
  const savings = originalDistance > 0 
    ? Math.round(((originalDistance - optimizedDistance) / originalDistance) * 100)
    : 0;
  
  // Estimate time (assuming average speed of 40 km/h in city)
  const estimatedTime = Math.round((optimizedDistance / 40) * 60);
  
  return {
    locations: optimizedLocations,
    totalDistance: Math.round(optimizedDistance * 10) / 10,
    estimatedTime,
    savings: Math.max(0, savings),
  };
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
