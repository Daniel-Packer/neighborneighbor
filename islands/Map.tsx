import { useEffect, useRef, useState } from "preact/hooks";
import { Signal } from "@preact/signals";
// Don't import Leaflet directly at the module level
// Instead we'll import it dynamically inside useEffect where we know window exists

// Define types for Leaflet
interface LeafletMarker {
  remove: () => void;
  addTo: (map: LeafletMap) => LeafletMarker;
}

interface LeafletLatLng {
  lat: number;
  lng: number;
}

interface LeafletEvent {
  latlng: LeafletLatLng;
}

interface LeafletIcon {
  className: string;
  html: string;
  iconSize: [number, number];
}

interface LeafletDivIcon {
  divIcon: (options: LeafletIcon) => unknown;
}

interface LeafletTileLayer {
  addTo: (map: LeafletMap) => unknown;
}

interface LeafletMapStatic {
  map: (element: HTMLElement) => LeafletMap;
  marker: (point: [number, number], options: {icon: unknown}) => LeafletMarker;
  tileLayer: (url: string, options: Record<string, unknown>) => LeafletTileLayer;
  divIcon: (options: LeafletIcon) => unknown;
}

interface LeafletMap {
  on: (event: string, callback: (e: LeafletEvent) => void) => void;
  off: (event: string, callback: (e: LeafletEvent) => void) => void;
  remove: () => void;
  setView: (center: [number, number], zoom: number) => LeafletMap;
}

// Define the types for our props
interface MapProps {
  id: string;
  center: [number, number];
  zoom: number;
  title: string;
  selectedPoint: Signal<[number, number] | null>;
  onPointSelect: (point: [number, number]) => void;
  onPointHover?: (point: [number, number] | null) => void;
  matchedPoints?: Signal<[number, number][]>;
}

export default function Map({ 
  id, 
  center, 
  zoom, 
  title, 
  selectedPoint, 
  onPointSelect,
  onPointHover,
  matchedPoints
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const matchedMarkersRef = useRef<LeafletMarker[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  
  // One-time initialization of the map
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined" || isMapInitialized) return;
    
    console.log(`Initializing map ${id}`);
    
    // Track initialization
    setIsMapInitialized(true);

    let L: LeafletMapStatic | null = null;
    let map: LeafletMap | null = null;
    let unsubscribe: () => void = () => {};

    // Dynamically import Leaflet only in the browser
    import("leaflet").then((leaflet) => {
      L = leaflet.default as unknown as LeafletMapStatic;
      
      // Make sure the Leaflet CSS is loaded
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const linkEl = document.createElement("link");
        linkEl.rel = "stylesheet";
        linkEl.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(linkEl);
      }
      
      // Initialize map when component mounts
      if (!mapRef.current) {
        console.error(`Map ref not found for ${id}`);
        return;
      }

      try {
        // Check if a map instance already exists for this container
        const mapElement = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
        if (mapElement && mapElement._leaflet_id) {
          console.log(`Map already exists for ${id}, cleaning up first`);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
          }
        }

        // Create the map instance
        map = L.map(mapRef.current).setView(center, zoom);
        mapInstanceRef.current = map;
        
        console.log(`Map ${id} created successfully`);
        
        // Add tile layer (OpenStreetMap)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add click handler to the map to select points
        map.on('click', (e: LeafletEvent) => {
          console.log(`Click on map ${id}:`, e.latlng);
          const { lat, lng } = e.latlng;
          onPointSelect([lat, lng]);
        });

        // Add mousemove handler if onPointHover is provided
        if (onPointHover) {
          let lastHoverPos: [number, number] | null = null;
          
          const handleMouseMove = (e: LeafletEvent) => {
            const { lat, lng } = e.latlng;
            const newPos: [number, number] = [lat, lng];
            
            // Only update if position has changed significantly
            if (!lastHoverPos || 
                Math.abs(lastHoverPos[0] - lat) > 0.0001 || 
                Math.abs(lastHoverPos[1] - lng) > 0.0001) {
              setIsHovering(true);
              setDebugMessage(`Hovering at ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
              onPointHover(newPos);
              lastHoverPos = newPos;
            }
          };
          
          const handleMouseOut = () => {
            setIsHovering(false);
            setDebugMessage(null);
            onPointHover(null);
            lastHoverPos = null;
          };
          
          map.on('mousemove', handleMouseMove);
          map.on('mouseout', handleMouseOut);
          
          // Add cleanup for these event handlers
          const originalRemove = map.remove;
          map.remove = function() {
            map?.off('mousemove', handleMouseMove);
            map?.off('mouseout', handleMouseOut);
            return originalRemove.apply(this, arguments as unknown as []);
          };
        }

        // Setup a subscription to update markers when selectedPoint changes
        unsubscribe = selectedPoint.subscribe((point) => {
          // Remove existing marker if any
          if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
          }

          // Add new marker if point is selected
          if (point && map && L) {
            const marker = L.marker(point, {
              icon: L.divIcon({
                className: 'selected-marker',
                html: '<div class="marker-dot"></div>',
                iconSize: [12, 12]
              })
            }).addTo(map);
            markerRef.current = marker;
          }
        });

        // Setup CSS for the markers
        if (!document.querySelector('style#map-marker-styles')) {
          const style = document.createElement('style');
          style.id = 'map-marker-styles';
          style.textContent = `
            .selected-marker .marker-dot {
              width: 12px;
              height: 12px;
              background-color: #FF0000;
              border-radius: 50%;
              border: 2px solid white;
            }
            .matched-marker .marker-dot {
              width: 10px;
              height: 10px;
              background-color: #FFAA00;
              border-radius: 50%;
              border: 2px solid white;
              opacity: 0.8;
            }
          `;
          document.head.appendChild(style);
        }
      } catch (error) {
        console.error(`Error initializing map ${id}:`, error);
      }
    }).catch(error => {
      console.error("Failed to load Leaflet:", error);
    });
    
    // Cleanup function to destroy map when component unmounts
    return () => {
      console.log(`Cleaning up map ${id}`);
      unsubscribe();
      
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (e) {
          console.error(`Error removing map ${id}:`, e);
        }
      }
      
      // Reset initialization state
      setIsMapInitialized(false);
    };
  }, [id]); // Only depend on ID to prevent reinitializations
  
  // Update view when center or zoom changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);
  
  // Handle matched points updates
  useEffect(() => {
    if (typeof window === "undefined" || !matchedPoints) return;
    
    console.log(`Updating matched points for ${id}:`, matchedPoints.value);
    
    // Store a reference to the current map instance to prevent stale closures
    const currentMapInstance = mapInstanceRef.current;
    if (!currentMapInstance) {
      console.log(`Map instance not available yet for ${id}`);
      return;
    }

    // First clear existing matched markers
    matchedMarkersRef.current.forEach(marker => {
      try {
        marker.remove();
      } catch (err) {
        console.error("Error removing marker:", err);
      }
    });
    matchedMarkersRef.current = [];

    // Don't do anything else if there are no points to display
    const points = matchedPoints.value;
    if (!points || points.length === 0) {
      console.log(`No matched points for ${id}`);
      return;
    }
    
    console.log(`Adding ${points.length} matched points to ${id}:`, points);

    // Import Leaflet and add markers
    import("leaflet").then((leaflet) => {
      const L = leaflet.default;

      // Create markers for each point with better error handling
      points.forEach((point, index) => {
        try {
          console.log(`Creating marker at ${point[0]}, ${point[1]} for ${id}`);
          
          // Check if the point is valid
          if (!Array.isArray(point) || point.length !== 2 || 
              typeof point[0] !== 'number' || typeof point[1] !== 'number') {
            console.error(`Invalid point at index ${index}:`, point);
            return; // Skip this point
          }
          
          // Create a much more visible marker
          const marker = L.marker([point[0], point[1]], {
            icon: L.divIcon({
              className: 'matched-marker',
              html: `<div style="
                width: 16px;
                height: 16px;
                background-color: #FF5500;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 6px rgba(0,0,0,0.8);
                opacity: 1;
              "></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })
          });
          
          // Add marker to map
          marker.addTo(currentMapInstance);
          
          // Add a popup to show coordinates
          marker.bindPopup(`Paired point: ${point[0].toFixed(5)}, ${point[1].toFixed(5)}`);
          
          // Store the marker reference
          matchedMarkersRef.current.push(marker);
          
          console.log(`Marker added for ${id} at ${point[0]}, ${point[1]}`);
          
        } catch (error) {
          console.error(`Error adding marker for ${id} at ${point}:`, error);
        }
      });
      
    }).catch(error => {
      console.error(`Failed to load Leaflet for matched points on ${id}:`, error);
    });
    
    return () => {
      // Clean up matched markers when component unmounts or points change
      matchedMarkersRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (err) {
          console.error("Error cleaning up marker:", err);
        }
      });
      matchedMarkersRef.current = [];
    };
  }, [matchedPoints?.value]); // Only depend on matchedPoints value changes

  return (
    <div class="map-container">
      <h2 class="text-xl font-bold mb-2">{title}</h2>
      <div 
        id={id} 
        ref={mapRef} 
        class="h-80 w-full rounded-lg shadow-md relative"
      >
        {isHovering && (
          <div class="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-md z-[9000]">
            Hovering
          </div>
        )}
      </div>
      {selectedPoint.value && (
        <div class="mt-2 text-sm">
          Selected: {selectedPoint.value[0].toFixed(5)}, {selectedPoint.value[1].toFixed(5)}
        </div>
      )}
      {debugMessage && (
        <div class="mt-1 text-xs text-blue-600">
          {debugMessage}
        </div>
      )}
      {matchedPoints?.value && matchedPoints.value.length > 0 && (
        <div class="mt-1 text-sm text-amber-600">
          {matchedPoints.value.length} paired point{matchedPoints.value.length !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}