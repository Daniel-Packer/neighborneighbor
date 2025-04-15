// filepath: /home/daniel/Documents/neighborneighbor/islands/CitySelector.tsx
import { useSignal } from "@preact/signals";

// Define the types
export type CityLocation = {
    name: string;
    coordinates: [number, number];
    zoom: number;
    key: string; // Adding key to each city for identification
};

// Define available cities as a flat array instead of pairs
export const AVAILABLE_CITIES: CityLocation[] = [
    {
        name: "Seattle, WA",
        coordinates: [47.6062, -122.3321],
        zoom: 10,
        key: "seattle",
    },
    {
        name: "Portland, OR",
        coordinates: [45.5152, -122.6784],
        zoom: 10,
        key: "portland",
    },
    {
        name: "New York, NY",
        coordinates: [40.7128, -74.0060],
        zoom: 10,
        key: "newyork",
    },
    {
        name: "Boston, MA",
        coordinates: [42.3601, -71.0589],
        zoom: 10,
        key: "boston",
    },
    {
        name: "San Francisco, CA",
        coordinates: [37.7749, -122.4194],
        zoom: 10,
        key: "sanfrancisco",
    },
    {
        name: "Los Angeles, CA",
        coordinates: [34.0522, -118.2437],
        zoom: 10,
        key: "losangeles",
    },
    {
        name: "Chicago, IL",
        coordinates: [41.8781, -87.6298],
        zoom: 10,
        key: "chicago",
    },
    {
        name: "Detroit, MI",
        coordinates: [42.3314, -83.0458],
        zoom: 10,
        key: "detroit",
    },
    {
        name: "Austin, TX",
        coordinates: [30.2672, -97.7431],
        zoom: 10,
        key: "austin",
    },
    {
        name: "Houston, TX",
        coordinates: [29.7604, -95.3698],
        zoom: 10,
        key: "houston",
    },
    {
        name: "Miami, FL",
        coordinates: [25.7617, -80.1918],
        zoom: 10,
        key: "miami",
    },
    {
        name: "Denver, CO",
        coordinates: [39.7392, -104.9903],
        zoom: 10,
        key: "denver",
    },
];

interface CitySelectorProps {
    onCitySelectionChange: (
        leftCity: CityLocation,
        rightCity: CityLocation,
    ) => void;
    initialLeftCityKey?: string;
    initialRightCityKey?: string;
}

export default function CitySelector({
    onCitySelectionChange,
    initialLeftCityKey = "seattle",
    initialRightCityKey = "portland",
}: CitySelectorProps) {
    // Find initial cities by key
    const initialLeftCity =
        AVAILABLE_CITIES.find((city) => city.key === initialLeftCityKey) ||
        AVAILABLE_CITIES[0];
    const initialRightCity =
        AVAILABLE_CITIES.find((city) => city.key === initialRightCityKey) ||
        AVAILABLE_CITIES[1];

    // Use signals for active city selections to enable reactivity
    const leftCityKey = useSignal<string>(initialLeftCity.key);
    const rightCityKey = useSignal<string>(initialRightCity.key);

    // Get the currently selected cities based on the keys
    const getSelectedCities = (): [CityLocation, CityLocation] => {
        const left =
            AVAILABLE_CITIES.find((city) => city.key === leftCityKey.value) ||
            AVAILABLE_CITIES[0];
        const right =
            AVAILABLE_CITIES.find((city) => city.key === rightCityKey.value) ||
            AVAILABLE_CITIES[1];
        return [left, right];
    };

    // Handle left city selection change
    const handleLeftCityChange = (e: Event) => {
        const select = e.target as HTMLSelectElement;
        leftCityKey.value = select.value;

        // Notify parent component about the change
        const [leftCity, rightCity] = getSelectedCities();
        onCitySelectionChange(leftCity, rightCity);
    };

    // Handle right city selection change
    const handleRightCityChange = (e: Event) => {
        const select = e.target as HTMLSelectElement;
        rightCityKey.value = select.value;

        // Notify parent component about the change
        const [leftCity, rightCity] = getSelectedCities();
        onCitySelectionChange(leftCity, rightCity);
    };

    return (
        <div class="flex flex-wrap gap-3">
            <div class="flex items-center">
                <label
                    htmlFor="leftCitySelect"
                    class="mr-2 text-sm font-medium"
                >
                    Left map:
                </label>
                <select
                    id="leftCitySelect"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={leftCityKey.value}
                    onChange={handleLeftCityChange}
                >
                    {AVAILABLE_CITIES.map((city) => (
                        <option value={city.key} key={city.key}>
                            {city.name}
                        </option>
                    ))}
                </select>
            </div>

            <div class="flex items-center">
                <label
                    htmlFor="rightCitySelect"
                    class="mr-2 text-sm font-medium"
                >
                    Right map:
                </label>
                <select
                    id="rightCitySelect"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={rightCityKey.value}
                    onChange={handleRightCityChange}
                >
                    {AVAILABLE_CITIES.map((city) => (
                        <option value={city.key} key={city.key}>
                            {city.name}
                        </option>
                    ))}
                </select>
            </div>

            <a
                href="/pairings"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 ml-auto"
            >
                View All Pairings
            </a>
        </div>
    );
}
