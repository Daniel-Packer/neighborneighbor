import { useEffect, useRef, useState } from "preact/hooks";
import { Signal } from "@preact/signals";
import { MatchedPoint } from "../src/interfaces.ts";

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
    marker: (
        point: [number, number],
        options: { icon: unknown },
    ) => LeafletMarker;
    tileLayer: (
        url: string,
        options: Record<string, unknown>,
    ) => LeafletTileLayer;
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
    matchedPoints?: Signal<MatchedPoint[]>;
}

export default function Map({
    id,
    center,
    zoom,
    title,
    selectedPoint,
    onPointSelect,
    onPointHover,
    matchedPoints,
}: MapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<LeafletMarker | null>(null);
    const matchedMarkersRef = useRef<LeafletMarker[]>([]);
    const [isHovering, setIsHovering] = useState(false);
    const [debugMessage, setDebugMessage] = useState<string | null>(null);
    const [isMapInitialized, setIsMapInitialized] = useState(false);

    // Create a unique identifier for this specific map instance
    // This will help ensure we properly reinitialize when the city changes
    const mapInstanceId = `${id}-${center[0]}-${center[1]}`;

    // Complete cleanup function to ensure all resources are freed when map changes
    const cleanupMap = () => {
        console.log(`Cleaning up map ${id}`);

        // Remove all matched markers first
        matchedMarkersRef.current.forEach((marker) => {
            try {
                marker.remove();
            } catch (err) {
                console.error(`Error removing matched marker for ${id}:`, err);
            }
        });
        matchedMarkersRef.current = [];

        // Remove the selected point marker
        if (markerRef.current) {
            try {
                markerRef.current.remove();
            } catch (err) {
                console.error(`Error removing selected marker for ${id}:`, err);
            }
            markerRef.current = null;
        }

        // Remove the map instance
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

    // One-time initialization of the map
    useEffect(() => {
        // Only run in browser environment
        if (typeof window === "undefined") return;

        console.log(
            `Initializing map ${id} with center: ${center[0]}, ${center[1]}`,
        );

        // Clean up any existing map for this ref before creating a new one
        cleanupMap();

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
                linkEl.href =
                    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(linkEl);
            }

            // Initialize map when component mounts
            if (!mapRef.current) {
                console.error(`Map ref not found for ${id}`);
                return;
            }

            try {
                // Check if a map instance already exists for this container
                const mapElement = mapRef.current as HTMLDivElement & {
                    _leaflet_id?: number;
                };
                if (mapElement && mapElement._leaflet_id) {
                    console.log(
                        `Map already exists for ${id}, cleaning up first`,
                    );
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.remove();
                    }
                }

                // Create the map instance
                map = L.map(mapRef.current).setView(center, zoom);
                mapInstanceRef.current = map;

                console.log(
                    `Map ${id} created successfully with center ${center[0]}, ${
                        center[1]
                    }`,
                );

                // Add tile layer (OpenStreetMap)
                L.tileLayer(
                    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    {
                        maxZoom: 19,
                        attribution:
                            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    },
                ).addTo(map);

                // Add click handler to the map to select points
                const handleMapClick = (e: LeafletEvent) => {
                    console.log(`Click on map ${id}:`, e.latlng);
                    const { lat, lng } = e.latlng;
                    onPointSelect([lat, lng]);
                };

                map.on("click", handleMapClick);

                // Add mousemove handler if onPointHover is provided
                if (onPointHover) {
                    let lastHoverPos: [number, number] | null = null;

                    const handleMouseMove = (e: LeafletEvent) => {
                        const { lat, lng } = e.latlng;
                        const newPos: [number, number] = [lat, lng];

                        // Only update if position has changed significantly
                        if (
                            !lastHoverPos ||
                            Math.abs(lastHoverPos[0] - lat) > 0.0001 ||
                            Math.abs(lastHoverPos[1] - lng) > 0.0001
                        ) {
                            setIsHovering(true);
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

                    map.on("mousemove", handleMouseMove);
                    map.on("mouseout", handleMouseOut);

                    // Make sure our event handlers are removed on cleanup
                    const originalRemove = map.remove;
                    map.remove = function () {
                        map?.off("mousemove", handleMouseMove);
                        map?.off("mouseout", handleMouseOut);
                        map?.off("click", handleMapClick);
                        return originalRemove.apply(
                            this,
                            arguments as unknown as [],
                        );
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
                                className: "selected-marker",
                                html: '<div class="marker-dot"></div>',
                                iconSize: [12, 12],
                            }),
                        }).addTo(map);
                        markerRef.current = marker;
                    }
                });

                // Setup CSS for the markers
                if (!document.querySelector("style#map-marker-styles")) {
                    const style = document.createElement("style");
                    style.id = "map-marker-styles";
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

                // Mark initialization as complete
                setIsMapInitialized(true);
            } catch (error) {
                console.error(`Error initializing map ${id}:`, error);
            }
        }).catch((error) => {
            console.error("Failed to load Leaflet:", error);
        });

        // Cleanup function to destroy map when component unmounts or city changes
        return () => {
            unsubscribe();
            cleanupMap();
        };
    }, [mapInstanceId]); // Depend on mapInstanceId to reinitialize when city changes

    // Update view when center or zoom changes without full reinitialization
    useEffect(() => {
        if (mapInstanceRef.current && isMapInitialized) {
            console.log(
                `Updating view for ${id} to center: ${center[0]}, ${
                    center[1]
                }, zoom: ${zoom}`,
            );
            mapInstanceRef.current.setView(center, zoom);
        }
    }, [center, zoom, isMapInitialized]);

    // Handle matched points updates
    useEffect(() => {
        if (
            typeof window === "undefined" || !matchedPoints || !isMapInitialized
        ) return;

        console.log(`Updating matched points for ${id}:`, matchedPoints.value);

        // Store a reference to the current map instance to prevent stale closures
        const currentMapInstance = mapInstanceRef.current;
        if (!currentMapInstance) {
            console.log(`Map instance not available yet for ${id}`);
            return;
        }

        // First clear existing matched markers
        matchedMarkersRef.current.forEach((marker) => {
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
                    console.log(
                        `Creating marker at ${point.coordinates[0]}, ${
                            point.coordinates[1]
                        } for ${id} with distance ${point.distance}`,
                    );

                    // Check if the point is valid
                    if (
                        !Array.isArray(point.coordinates) ||
                        point.coordinates.length !== 2 ||
                        typeof point.coordinates[0] !== "number" ||
                        typeof point.coordinates[1] !== "number"
                    ) {
                        console.error(
                            `Invalid point at index ${index}:`,
                            point,
                        );
                        return; // Skip this point
                    }

                    // Calculate size and opacity based on distance
                    // For points with distance close to 0, we want larger size and full opacity
                    // For points with distance close to 1, we want smaller size and lower opacity
                    // Use an inverse relationship with distance
                    const distanceFactor = 1 -
                        Math.min(1, Math.max(0, point.distance));

                    // Size ranges from 8px (far) to 24px (near)
                    const size = 8 + (distanceFactor * 16);

                    // Opacity ranges from 0.3 (far) to 1.0 (near)
                    const opacity = 0.3 + (distanceFactor * 0.7);

                    // Border width ranges from 1px (far) to 3px (near)
                    const borderWidth = 1 + (distanceFactor * 2);

                    // Create a much more visible marker with distance-based styling
                    const marker = L.marker([
                        point.coordinates[0],
                        point.coordinates[1],
                    ], {
                        icon: L.divIcon({
                            className: "matched-marker",
                            html: `<div style="
                width: ${size}px;
                height: ${size}px;
                background-color: ${point.color};
                border-radius: 50%;
                box-shadow: 0 0 6px rgba(0,0,0,0.4);
                opacity: ${opacity};
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              "></div>`,
                            iconSize: [0, 0], // Set to zero to prevent default sizing
                            iconAnchor: [0, 0], // Let the CSS handle the positioning instead
                        }),
                    });

                    // Add marker to map
                    marker.addTo(currentMapInstance);

                    // Format distance as percentage (0% = closest, 100% = furthest)
                    const distancePercent = Math.round(point.distance * 100);

                    // Add a popup to show coordinates and distance
                    marker.bindPopup(`
            <strong>Paired point</strong><br>
            Coordinates: ${point.coordinates[0].toFixed(5)}, ${
                        point.coordinates[1].toFixed(5)
                    }<br>
            Distance: ${distancePercent}% (${
                        distancePercent === 0
                            ? "closest"
                            : distancePercent === 100
                            ? "furthest"
                            : "relative"
                    })
          `);

                    // Store the marker reference
                    matchedMarkersRef.current.push(marker);

                    console.log(
                        `Marker added for ${id} at ${point.coordinates[0]}, ${
                            point.coordinates[1]
                        } with size ${size}px and opacity ${opacity}`,
                    );
                } catch (error) {
                    console.error(
                        `Error adding marker for ${id} at ${point.coordinates}:`,
                        error,
                    );
                }
            });
        }).catch((error) => {
            console.error(
                `Failed to load Leaflet for matched points on ${id}:`,
                error,
            );
        });

        return () => {
            // Clean up matched markers when component unmounts or points change
            matchedMarkersRef.current.forEach((marker) => {
                try {
                    marker.remove();
                } catch (err) {
                    console.error("Error cleaning up marker:", err);
                }
            });
            matchedMarkersRef.current = [];
        };
    }, [matchedPoints?.value, isMapInitialized]); // Depend on both matchedPoints and initialization

    return (
        <div class="map-container">
            <h2 class="text-xl font-bold mb-2">{title}</h2>
            <div
                id={id}
                ref={mapRef}
                key={mapInstanceId} // Add key to ensure DOM element is recreated for new cities
                class="h-80 w-full rounded-lg shadow-md relative"
            >
                {!isMapInitialized && (
                    <div class="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500">
                        Loading map...
                    </div>
                )}
            </div>
            {debugMessage && (
                <div class="mt-1 text-xs text-blue-600">
                    {debugMessage}
                </div>
            )}
        </div>
    );
}
