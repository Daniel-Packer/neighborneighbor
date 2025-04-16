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

  const amplification = 500;
  
  // Amplify the coordinates to create higher frequency color changes
  // This makes it easier to distinguish points that are close together
  const amplifiedLng = (normalizedLng * amplification) % 1; // Cycles every 36 degrees of longitude instead of 360
  const amplifiedLat = (normalizedLat * amplification) % 1; // Cycles every 18 degrees of latitude instead of 180
  
  // Use amplified values to determine HSL color
  // Hue: Use amplified longitude for a full spectrum (0-360)
  const hue = Math.floor(amplifiedLng * 360);
  
  // Saturation: Use amplified latitude to vary saturation
  // This creates more variation in colors for nearby points
  const saturation = Math.floor(70 + amplifiedLat * 30); // 70-100% saturation range
  
  // Lightness: Use a mid-range lightness for good visibility
  // Create variation based on a combination of lat/lng for more distinct colors
  const lightness = Math.floor(50 + ((amplifiedLat + amplifiedLng) % 1) * 20); // 50-70% lightness
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generates a color based on a pairing of coordinates.
 * Uses the midpoint between the two locations to ensure the same pairing
 * always gets the same color, but with higher frequency changes.
 * 
 * @param coords1 First coordinates [lat, lng]
 * @param coords2 Second coordinates [lat, lng]
 * @returns CSS color string
 */
export function getPairingColor(coords1: [number, number], coords2: [number, number]): string {
  // Use the midpoint of the two coordinates to generate a color
  const midLat = (coords1[0] + coords2[0]) / 2;
  const midLng = (coords1[1] + coords2[1]) / 2;
  
  // Also incorporate the distance between points to add more variation
  const latDiff = Math.abs(coords1[0] - coords2[0]);
  const lngDiff = Math.abs(coords1[1] - coords2[1]);
  
  // Add a slight offset based on the distance to create even more distinct colors
  const offsetLat = midLat + (latDiff * 2.5) % 1;
  const offsetLng = midLng + (lngDiff * 2.5) % 1;
  
  return getColorFromCoordinates(offsetLat, offsetLng);
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