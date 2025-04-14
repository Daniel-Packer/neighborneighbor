import { useEffect, useRef } from "preact/hooks";
// Don't import Leaflet directly at the module level
// Instead we'll import it dynamically inside useEffect where we know window exists

// Define the types for our props
interface MapProps {
  id: string;
  center: [number, number];
  zoom: number;
  title: string;
}

export default function Map({ id, center, zoom, title }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    // Dynamically import Leaflet only in the browser
    import("leaflet").then((L) => {
      // Make sure the Leaflet CSS is loaded
      const linkEl = document.createElement("link");
      linkEl.rel = "stylesheet";
      linkEl.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(linkEl);
      
      // Initialize map when component mounts
      if (!mapRef.current) return;

      // Create the map instance
      const map = L.default.map(mapRef.current).setView(center, zoom);
      
      // Add tile layer (OpenStreetMap)
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Cleanup function to destroy map when component unmounts
      return () => {
        map.remove();
      };
    });
  }, [center, zoom]); // Re-initialize if center or zoom changes
  
  return (
    <div class="map-container">
      <h2 class="text-xl font-bold mb-2">{title}</h2>
      <div 
        id={id} 
        ref={mapRef} 
        class="h-80 w-full rounded-lg shadow-md"
      ></div>
    </div>
  );
}