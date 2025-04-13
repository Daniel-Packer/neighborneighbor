import { useEffect, useState, useRef, useCallback } from "preact/hooks";

// Type definitions for GeoJSON data
interface Coordinate extends Array<number> {}
interface Ring extends Array<Coordinate> {}
interface Polygon extends Array<Ring> {}
interface MultiPolygon extends Array<Polygon> {}

interface Geometry {
  type: string;
  coordinates: Coordinate | Ring | Polygon | MultiPolygon;
}

interface Feature {
  type: string;
  properties: Record<string, string | number | boolean | null>;
  geometry: Geometry;
}

interface GeoJSON {
  type: string;
  features: Feature[];
}

// ViewBox coordinates for panning and zooming
interface ViewBoxCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Helper function to debounce function calls
const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: number | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function NYCMap(
  { onBlockClick }: { onBlockClick?: (blockId: string) => void },
) {
  const [geoData, setGeoData] = useState<GeoJSON | null>(null);
  const [simplifiedData, setSimplifiedData] = useState<GeoJSON | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Zoom and pan state
  const [viewBoxCoords, setViewBoxCoords] = useState<ViewBoxCoords>({ x: 0, y: 0, width: 1000, height: 1000 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialViewBox, setInitialViewBox] = useState<ViewBoxCoords | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLevel = useRef<number>(1);
  const animationFrameId = useRef<number | null>(null);
  const requestedViewBox = useRef<ViewBoxCoords | null>(null);
  const [useDetailedMap, setUseDetailedMap] = useState(true);
  const [visibleFeatures, setVisibleFeatures] = useState<Set<string>>(new Set());

  // Helper to format viewBox string from coordinates
  const viewBox = `${viewBoxCoords.x} ${viewBoxCoords.y} ${viewBoxCoords.width} ${viewBoxCoords.height}`;

  // Create a simplified version of polygon coordinates for better performance
  const simplifyPolygon = (coordinates: Ring | Polygon | MultiPolygon, type: string): Ring | Polygon | MultiPolygon => {
    if (type === "Polygon") {
      // Take every Nth point for the outer ring (index 0) to preserve shape
      // but reduce complexity. Keep all points for inner rings (holes)
      return (coordinates as Polygon).map((ring, ringIndex) => {
        if (ringIndex === 0 && ring.length > 30) {
          return ring.filter((_, i) => i % 3 === 0 || i === ring.length - 1);
        }
        return ring;
      });
    } else if (type === "MultiPolygon") {
      return (coordinates as MultiPolygon).map((polygon) => {
        return polygon.map((ring, ringIndex) => {
          if (ringIndex === 0 && ring.length > 30) {
            return ring.filter((_, i) => i % 3 === 0 || i === ring.length - 1);
          }
          return ring;
        });
      });
    }
    return coordinates;
  };

  // Convert GeoJSON coordinates to SVG path string
  const coordinatesToPath = (coordinates: Ring | Polygon | MultiPolygon, type: string): string => {
    if (type === "Polygon") {
      // Handle a single polygon
      return (coordinates as Polygon).map((ring) => {
        return ring.map((coord, i) => 
          `${i === 0 ? 'M' : 'L'}${coord[0]},${coord[1]}`
        ).join(' ') + 'Z';
      }).join(' ');
    } else if (type === "MultiPolygon") {
      // Handle multiple polygons
      return (coordinates as MultiPolygon).map((polygon) => {
        return polygon.map((ring) => {
          return ring.map((coord, i) => 
            `${i === 0 ? 'M' : 'L'}${coord[0]},${coord[1]}`
          ).join(' ') + 'Z';
        }).join(' ');
      }).join(' ');
    }
    return '';
  };

  // Check if a feature is visible in the current viewBox
  const isFeatureVisible = (feature: Feature): boolean => {
    const { type, coordinates } = feature.geometry;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    if (type === "Polygon") {
      (coordinates as Polygon).forEach((ring) => {
        ring.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        });
      });
    } else if (type === "MultiPolygon") {
      (coordinates as MultiPolygon).forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          });
        });
      });
    }
    
    // Feature bounds overlap with viewBox
    return !(maxX < viewBoxCoords.x || 
             minX > viewBoxCoords.x + viewBoxCoords.width || 
             maxY < viewBoxCoords.y || 
             minY > viewBoxCoords.y + viewBoxCoords.height);
  };

  // Calculate bounds of all features to set SVG viewBox
  const calculateBounds = (data: GeoJSON) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    data.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      
      if (feature.geometry.type === "Polygon") {
        coords.forEach((ring: number[][]) => {
          ring.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          });
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        coords.forEach((polygon: number[][][]) => {
          polygon.forEach((ring: number[][]) => {
            ring.forEach(([x, y]) => {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            });
          });
        });
      }
    });

    return { minX, maxX, minY, maxY };
  };

  // Handle zoom with mouse wheel
  const handleWheel = useCallback(debounce((e: WheelEvent) => {
    e.preventDefault();
    
    if (!svgRef.current) return;
    
    // Get current cursor position relative to SVG
    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    
    // Convert mouse position to SVG coordinates
    const pointX = viewBoxCoords.x + (mouseX / svgRect.width) * viewBoxCoords.width;
    const pointY = viewBoxCoords.y + (mouseY / svgRect.height) * viewBoxCoords.height;
    
    // Calculate zoom factor
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9; // Zoom out or in
    
    // Calculate new viewBox dimensions
    const newWidth = viewBoxCoords.width * zoomFactor;
    const newHeight = viewBoxCoords.height * zoomFactor;
    
    // Adjust viewBox position to keep mouse point stationary
    const newX = pointX - (mouseX / svgRect.width) * newWidth;
    const newY = pointY - (mouseY / svgRect.height) * newHeight;
    
    requestedViewBox.current = {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    };

    if (animationFrameId.current === null) {
      animationFrameId.current = requestAnimationFrame(() => {
        if (requestedViewBox.current) {
          setViewBoxCoords(requestedViewBox.current);
          requestedViewBox.current = null;
        }
        animationFrameId.current = null;
      });
    }

    // Update zoom level and LOD
    zoomLevel.current = zoomFactor > 1 ? zoomLevel.current * 1.1 : zoomLevel.current * 0.9;
    setUseDetailedMap(zoomLevel.current > 1.5);
  }, 50), [viewBoxCoords]);

  // Pan event handlers
  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !svgRef.current) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.x) * (viewBoxCoords.width / svgRect.width);
    const dy = (e.clientY - dragStart.y) * (viewBoxCoords.height / svgRect.height);
    
    setViewBoxCoords({
      ...viewBoxCoords,
      x: viewBoxCoords.x - dx,
      y: viewBoxCoords.y - dy
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset zoom to original view
  const resetZoom = () => {
    if (initialViewBox) {
      setViewBoxCoords(initialViewBox);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/census-blocks');
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        const data = await response.json();
        console.log("GeoJSON data:", data);
        setGeoData(data);
        
        // Calculate viewBox from data bounds
        const bounds = calculateBounds(data);
        const padding = 0.05; // 5% padding
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        
        // Create initial viewBox coordinates
        const vb = {
          x: bounds.minX - width * padding,
          y: bounds.minY - height * padding,
          width: width * (1 + padding * 2),
          height: height * (1 + padding * 2)
        };
        
        setViewBoxCoords(vb);
        setInitialViewBox(vb); // Store initial view for reset

        // Create simplified data for lower zoom levels
        const simplifiedFeatures = data.features.map(feature => ({
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: simplifyPolygon(feature.geometry.coordinates, feature.geometry.type)
          }
        }));
        setSimplifiedData({ ...data, features: simplifiedFeatures });
      } catch (err) {
        console.error("Error fetching GeoJSON:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    
    // Add event listener for mouseup outside the SVG
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onBlockClick]);

  // Update visible features when viewBox changes
  useEffect(() => {
    const dataToRender = useDetailedMap ? geoData : simplifiedData;
    if (!dataToRender) return;
    
    // Calculate which features are visible in the current viewBox
    const visible = new Set<string>();
    dataToRender.features.forEach((feature, idx) => {
      const blockId = (feature.properties.GEOID as string) || 
                     (feature.properties.id as string) || 
                     `block-${idx}`;
      
      if (isFeatureVisible(feature)) {
        visible.add(blockId);
      }
    });
    
    setVisibleFeatures(visible);
  }, [viewBoxCoords, geoData, simplifiedData, useDetailedMap]);

  if (isLoading) {
    return <div class="flex justify-center items-center h-96">Loading census blocks...</div>;
  }

  if (error) {
    return <div class="text-red-500 p-4 border border-red-300 rounded bg-red-50">Error: {error}</div>;
  }

  if (!geoData) {
    return <div>No data available</div>;
  }

  const dataToRender = useDetailedMap ? geoData : simplifiedData;

  return (
    <div class="w-full border border-gray-200 rounded-lg overflow-hidden">
      <div class="bg-gray-100 p-2 flex justify-between items-center">
        <div class="text-sm font-medium text-gray-500">
          NYC Census Blocks Map
        </div>
        <div class="flex gap-2">
          <button 
            onClick={resetZoom}
            class="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            Reset View
          </button>
          <button 
            onClick={() => {
              if (!initialViewBox) return;
              setViewBoxCoords({
                ...viewBoxCoords,
                width: viewBoxCoords.width * 0.8,
                height: viewBoxCoords.height * 0.8
              });
            }}
            class="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            Zoom In
          </button>
          <button 
            onClick={() => {
              if (!initialViewBox) return;
              setViewBoxCoords({
                ...viewBoxCoords,
                width: viewBoxCoords.width * 1.2,
                height: viewBoxCoords.height * 1.2
              });
            }}
            class="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            Zoom Out
          </button>
        </div>
      </div>
      <svg 
        ref={svgRef}
        viewBox={viewBox}
        width="100%" 
        height="600px"
        style={{ 
          backgroundColor: "#f8f9fa", 
          cursor: isDragging ? "grabbing" : "grab",
          transition: isDragging ? "none" : "all 0.2s ease-out"
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {dataToRender?.features.map((feature, idx) => {
          const blockId = (feature.properties.GEOID as string) || 
                        (feature.properties.id as string) || 
                        `block-${idx}`;
          if (!visibleFeatures.has(blockId)) return null;
          return (
            <path
              key={blockId}
              d={coordinatesToPath(feature.geometry.coordinates, feature.geometry.type)}
              fill="#cfe2ff"
              stroke="#3b82f6"
              stroke-width="0.1"
              onClick={() => onBlockClick && onBlockClick(blockId)}
              onMouseOver={(e) => {
                e.currentTarget.style.fill = "#93c5fd";
                e.currentTarget.style.cursor = "pointer";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.fill = "#cfe2ff";
                e.currentTarget.style.cursor = isDragging ? "grabbing" : "grab";
              }}
              class="transition-colors duration-200"
            />
          );
        })}
      </svg>
      <div class="text-xs text-gray-500 p-2 bg-gray-50">
        Use mouse wheel to zoom, click and drag to pan
      </div>
    </div>
  );
}