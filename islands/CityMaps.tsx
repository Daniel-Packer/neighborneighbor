// Generic city map component that handles any two cities
import { Signal, useComputed, useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import Map from "./Map.tsx";
import PairingControls from "./PairingControls.tsx";
import { CityLocation } from "./CitySelector.tsx";
import type { MatchedPointsParams } from "../src/interfaces.ts";
import { isLocationPoint } from "../src/validation.ts";
import { LocationPairing, PairingRecord } from "../src/interfaces.ts";

// Define the props interface using CityLocation from CitySelector
interface CityMapsProps {
    cities: [CityLocation, CityLocation];
    cityKeys: [string, string]; // API keys for the cities (e.g., ["seattle", "portland"])
}

// Helper to validate a pairing object with dynamic city keys
function isValidPairingRecord(
    record: unknown,
    cityKeys: string[],
): record is PairingRecord {
    if (typeof record !== "object" || record === null) {
        console.log("Invalid record: not an object");
        return false;
    }

    if (!("id" in record) || !("pairing" in record)) {
        console.log("Invalid record: missing id or pairing property");
        return false;
    }

    const pairing = (record as PairingRecord).pairing;

    if (typeof pairing !== "object" || pairing === null) {
        console.log("Invalid record: pairing is not an object");
        return false;
    }

    // Check that all required city keys exist
    for (const cityKey of cityKeys) {
        if (!(cityKey in pairing)) {
            console.log(
                `Invalid record: pairing missing city key "${cityKey}"`,
            );
            return false;
        }

        const cityPoint = pairing[cityKey];

        if (!isLocationPoint(cityPoint)) {
            console.log(
                `Invalid record: ${cityKey} is not a valid LocationPoint`,
            );
            return false;
        }
    }

    return true;
}

// Helper function to find matched points between cities
function useMatchedCityPoints({
    hoverPoint,
    pairings,
    sourceCity,
    targetCity,
    sourceCityName,
    targetCityName,
}: MatchedPointsParams): Signal<[number, number][]> {
    return useComputed(() => {
        if (!hoverPoint.value || pairings.value.length === 0) {
            return [];
        }

        // Find target city points that are paired with source city points near the hover
        const [hlat, hlng] = hoverPoint.value;
        console.log(
            `Finding ${targetCityName} points near ${sourceCityName} hover: ${
                hlat.toFixed(5)
            }, ${hlng.toFixed(5)}`,
        );

        const matchedPoints = pairings.value
            .filter((pairing) => {
                const sourcePoint = pairing[sourceCity];
                if (!isLocationPoint(sourcePoint)) return false;

                const [plat, plng] = sourcePoint.coordinates;

                // Calculate distance - using simple Euclidean distance
                const distance = Math.sqrt(
                    Math.pow(plat - hlat, 2) + Math.pow(plng - hlng, 2),
                );

                // Match if within a small radius
                const isNearby = distance < 0.01; // About 5km
                if (isNearby) {
                    console.log(
                        `Found nearby ${sourceCityName} point at ${
                            plat.toFixed(5)
                        }, ${plng.toFixed(5)}, distance: ${
                            distance.toFixed(5)
                        }`,
                    );
                }
                return isNearby;
            })
            .map((pairing) => {
                const targetPoint = pairing[targetCity];
                return isLocationPoint(targetPoint)
                    ? targetPoint.coordinates
                    : null;
            })
            .filter((coordinates): coordinates is [number, number] =>
                coordinates !== null
            );

        console.log(
            `Found ${matchedPoints.length} matching ${targetCityName} points`,
        );
        return matchedPoints;
    });
}

export default function CityMaps({ cities, cityKeys }: CityMapsProps) {
    const [city1, city2] = cities;
    const [city1Key, city2Key] = cityKeys;

    // Use a key based on city pairs to help identify when cities change
    const citiesKey = `${city1Key}-${city2Key}`;
    console.log(`Rendering CityMaps with cities: ${citiesKey}`);

    const city1Point = useSignal<[number, number] | null>(null);
    const city2Point = useSignal<[number, number] | null>(null);
    const city1HoverPoint = useSignal<[number, number] | null>(null);
    const city2HoverPoint = useSignal<[number, number] | null>(null);
    const pairings = useSignal<LocationPairing[]>([]);
    const isLoading = useSignal<boolean>(false);
    const [debug, setDebug] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    // Using the abstracted helper function for both city matches
    const city1MatchedPoints = useMatchedCityPoints({
        hoverPoint: city2HoverPoint,
        pairings,
        sourceCity: city2Key,
        targetCity: city1Key,
        sourceCityName: city2.name,
        targetCityName: city1.name,
    });

    const city2MatchedPoints = useMatchedCityPoints({
        hoverPoint: city1HoverPoint,
        pairings,
        sourceCity: city1Key,
        targetCity: city2Key,
        sourceCityName: city1.name,
        targetCityName: city2.name,
    });

    // Functions to handle point selection
    const handleCity1Select = (point: [number, number]) => {
        city1Point.value = point;
        console.log(`${city1.name} point selected: ${point[0]}, ${point[1]}`);
    };

    const handleCity2Select = (point: [number, number]) => {
        city2Point.value = point;
        console.log(`${city2.name} point selected: ${point[0]}, ${point[1]}`);
    };

    // Functions to handle hover
    const handleCity1Hover = (point: [number, number] | null) => {
        city1HoverPoint.value = point;
        if (point) {
            setDebug(
                `${city1.name} hover: ${point[0].toFixed(5)}, ${
                    point[1].toFixed(5)
                }`,
            );
        } else {
            setDebug(null);
        }
    };

    const handleCity2Hover = (point: [number, number] | null) => {
        city2HoverPoint.value = point;
        if (point) {
            setDebug(
                `${city2.name} hover: ${point[0].toFixed(5)}, ${
                    point[1].toFixed(5)
                }`,
            );
        } else {
            setDebug(null);
        }
    };

    // Reset all state when cities change
    useEffect(() => {
        console.log(
            `Cities changed to ${city1.name} and ${city2.name}, resetting state`,
        );

        // Reset all signal values
        city1Point.value = null;
        city2Point.value = null;
        city1HoverPoint.value = null;
        city2HoverPoint.value = null;
        pairings.value = [];

        // Clear stateful values
        setDebug(null);
        setError(null);
        setLastFetch(null);

        // Then fetch pairings for the new cities
        fetchPairings();
    }, [citiesKey]);

    // Fetch pairings data
    const fetchPairings = async () => {
        isLoading.value = true;
        setError(null);

        try {
            const response = await fetch("/api/pairings");
            if (!response.ok) {
                throw new Error(`Failed to fetch pairings: ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("API returned non-array data");
            }

            console.log(`Fetched ${data.length} total pairings`);

            // Validate pairings and filter out invalid ones
            const validPairings = data.filter((pairing) => {
                const isValid = isValidPairingRecord(pairing, cityKeys);
                if (!isValid) {
                    // Only log as warning if it has our city keys but invalid format
                    if (
                        pairing?.pairing &&
                        (pairing.pairing[city1Key] || pairing.pairing[city2Key])
                    ) {
                        console.warn(
                            `Found invalid pairing with our city keys:`,
                            pairing,
                        );
                    }
                }
                return isValid;
            });

            console.log(
                `${validPairings.length} valid pairings for ${city1.name}-${city2.name} after filtering`,
            );

            // Update state
            pairings.value = validPairings.map((record) => record.pairing);
            setLastFetch(new Date());

            if (validPairings.length > 0) {
                console.log("Sample valid pairing:", validPairings[0]);
            } else if (data.length > 0) {
                console.log(
                    "No valid pairings found for the current city pair",
                );
            }
        } catch (error: unknown) {
            console.error("Error fetching pairings:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : "Unknown error";
            setError(`Error fetching pairings: ${errorMessage}`);
            pairings.value = [];
        } finally {
            isLoading.value = false;
        }
    };

    // Fetch pairings on component mount
    useEffect(() => {
        fetchPairings();
    }, [citiesKey]); // Re-run when cities change

    // Fetch pairings data with an interval
    useEffect(() => {
        // Initial fetch is done by the first useEffect

        // Fetch every 10 seconds
        const intervalId = setInterval(fetchPairings, 10000);
        return () => clearInterval(intervalId);
    }, [citiesKey]); // Re-create interval when cities change

    return (
        <>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-4 rounded-lg shadow">
                    <Map
                        id={`map-${city1Key}`}
                        center={city1.coordinates}
                        zoom={city1.zoom}
                        title={city1.name}
                        selectedPoint={city1Point}
                        onPointSelect={handleCity1Select}
                        onPointHover={handleCity1Hover}
                        matchedPoints={city1MatchedPoints}
                    />
                    {city2MatchedPoints.value.length > 0 && (
                        <div class="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            Found {city2MatchedPoints.value.length}{" "}
                            matching points in {city2.name}
                        </div>
                    )}
                </div>

                <div class="bg-white p-4 rounded-lg shadow">
                    <Map
                        id={`map-${city2Key}`}
                        center={city2.coordinates}
                        zoom={city2.zoom}
                        title={city2.name}
                        selectedPoint={city2Point}
                        onPointSelect={handleCity2Select}
                        onPointHover={handleCity2Hover}
                        matchedPoints={city2MatchedPoints}
                    />
                    {city1MatchedPoints.value.length > 0 && (
                        <div class="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            Found {city1MatchedPoints.value.length}{" "}
                            matching points in {city1.name}
                        </div>
                    )}
                </div>
            </div>

            {debug && (
                <div class="mt-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    {debug}
                </div>
            )}

            {error && (
                <div class="mt-4 p-2 bg-red-50 border border-red-200 rounded-md text-red-700">
                    Error: {error}
                </div>
            )}

            {isLoading.value && (
                <div class="mt-4 p-2 bg-gray-50 border border-gray-200 rounded-md text-center">
                    Loading pairings...
                </div>
            )}

            {!isLoading.value && pairings.value.length === 0 && (
                <div class="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-center">
                    No pairings available yet for{" "}
                    {city1.name}-{city2.name}. Create some!
                </div>
            )}

            {!isLoading.value && pairings.value.length > 0 && (
                <div class="mt-4 p-2 bg-green-50 border border-green-200 rounded-md text-center">
                    {pairings.value.length} pairings loaded for{" "}
                    {city1.name}-{city2.name}
                    {lastFetch && (
                        <span class="text-xs block text-gray-500">
                            Last updated: {lastFetch.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            )}

            <PairingControls
                city1={{
                    key: city1Key,
                    name: city1.name,
                    point: city1Point,
                }}
                city2={{
                    key: city2Key,
                    name: city2.name,
                    point: city2Point,
                }}
                onPairingCreated={() => {
                    // Refresh pairings when a new one is created
                    fetchPairings();
                }}
            />
        </>
    );
}
