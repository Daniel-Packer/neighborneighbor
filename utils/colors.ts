// filepath: /home/daniel/Documents/neighborneighbor/utils/colors.ts

/**
 * Utility functions for generating colors based on geographic coordinates
 */

/**
 * Generates a color based on geographic coordinates.
 * This creates a continuous color gradient across the map.
 * 
 * @param lat Latitude (typically -90 to 90)
 * @param lng Longitude (typically -180 to 180)
 * @returns CSS color string in hsl format
 */
export function getColorFromCoordinates(lat: number, lng: number): string {
  // Normalize coordinates to a 0-1 range
  // Note: These ranges are approximate and don't cover the entire possible range
  // of lat/lng values, but this gives a good distribution for most populated areas
  const normalizedLat = (lat + 90) / 180; // -90 to 90 -> 0 to 1
  const normalizedLng = (lng + 180) / 360; // -180 to 180 -> 0 to 1
  
  // Use normalized values to determine HSL color
  // Hue: Use longitude for a full spectrum (0-360)
  const hue = Math.floor(normalizedLng * 360);
  
  // Saturation: Higher near equator, lower near poles
  // This creates more vibrant colors for most populated areas
  const saturation = Math.floor(80 - Math.abs(normalizedLat - 0.5) * 60);
  
  // Lightness: Use a mid-range lightness for good visibility
  // Slightly lighter near poles, slightly darker near equator
  const lightness = Math.floor(55 + Math.abs(normalizedLat - 0.5) * 20);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generates a color based on a pairing of coordinates.
 * Uses the midpoint between the two locations to ensure the same pairing
 * always gets the same color.
 * 
 * @param coords1 First coordinates [lat, lng]
 * @param coords2 Second coordinates [lat, lng]
 * @returns CSS color string
 */
export function getPairingColor(coords1: [number, number], coords2: [number, number]): string {
  // Use the midpoint of the two coordinates to generate a color
  const midLat = (coords1[0] + coords2[0]) / 2;
  const midLng = (coords1[1] + coords2[1]) / 2;
  
  return getColorFromCoordinates(midLat, midLng);
}

/**
 * Creates a unique color identifier for a pairing based on its city keys and coordinates
 * This ensures that the same pairing always gets the same color
 */
export function getPairingColorId(
  sourceCity: string, 
  targetCity: string, 
  sourceCoords: [number, number], 
  targetCoords: [number, number]
): string {
  // Sort city keys to ensure consistent ordering
  const [firstCity, secondCity] = [sourceCity, targetCity].sort();
  
  // Use the city pair as the basis for the ID, along with the midpoint coordinates
  const midLat = (sourceCoords[0] + targetCoords[0]) / 2;
  const midLng = (sourceCoords[1] + targetCoords[1]) / 2;
  
  // Round to 5 decimal places for a stable identifier
  const lat = Math.round(midLat * 100000) / 100000;
  const lng = Math.round(midLng * 100000) / 100000;
  
  return `${firstCity}-${secondCity}-${lat}-${lng}`;
}