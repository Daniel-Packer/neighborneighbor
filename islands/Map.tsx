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

    import("leaflet").then((L) => {
      // Need to wait for map to initialize
      if (!mapInstanceRef.current) {
        console.log(`Map instance not available yet for ${id}`);
        return;
      }
      
      // Clear existing matched markers
      matchedMarkersRef.current.forEach(marker => marker.remove());
      matchedMarkersRef.current = [];
      
      // Add new markers for each matched point
      const points = matchedPoints.value;
      if (points && points.length > 0) {
        console.log(`Adding ${points.length} matched points to ${id}`);
        points.forEach(point => {
          try {
            const marker = L.default.marker(point, {
              icon: L.default.divIcon({
                className: 'matched-marker',
                html: '<div class="marker-dot"></div>',
                iconSize: [10, 10]
              })
            }).addTo(mapInstanceRef.current!);
            
            matchedMarkersRef.current.push(marker);
          } catch (error) {
            console.error(`Error adding marker at ${point}:`, error);
          }
        });
      }
    }).catch(error => {
      console.error("Failed to load Leaflet for matched points:", error);
    });
    
    return () => {
      // Clean up matched markers when component unmounts or points change
      matchedMarkersRef.current.forEach(marker => marker.remove());
      matchedMarkersRef.current = [];
    };
  }, [id, matchedPoints?.value]); // Dependency on matchedPoints value

  return (
    <div class="map-container">
      <h2 class="text-xl font-bold mb-2">{title}</h2>
      <div 
        id={id} 
        ref={mapRef} 
        class="h-80 w-full rounded-lg shadow-md relative"
      >
        {isHovering && (
          <div class="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-md">
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