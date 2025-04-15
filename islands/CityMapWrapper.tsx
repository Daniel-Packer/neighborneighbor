import { useState } from "preact/hooks";
import CityMaps from "./CityMaps.tsx";
import CitySelector, { AVAILABLE_CITIES, type CityLocation } from "./CitySelector.tsx";

interface CityMapWrapperProps {
  initialLeftCityKey?: string;
  initialRightCityKey?: string;
}

export default function CityMapWrapper({ 
  initialLeftCityKey = "seattle", 
  initialRightCityKey = "portland" 
}: CityMapWrapperProps) {
  // Find initial cities from the available cities list
  const initialLeftCity = AVAILABLE_CITIES.find(city => city.key === initialLeftCityKey) || AVAILABLE_CITIES[0];
  const initialRightCity = AVAILABLE_CITIES.find(city => city.key === initialRightCityKey) || AVAILABLE_CITIES[1];
  
  // Use useState to track the current cities
  const [leftCity, setLeftCity] = useState<CityLocation>(initialLeftCity);
  const [rightCity, setRightCity] = useState<CityLocation>(initialRightCity);

  // Handle city selection changes
  const handleCitySelectionChange = (newLeftCity: CityLocation, newRightCity: CityLocation) => {
    setLeftCity(newLeftCity);
    setRightCity(newRightCity);
    console.log(`Selected cities: ${newLeftCity.name} and ${newRightCity.name}`);
  };

  return (
    <>
      <div class="mb-6">
        <CitySelector 
          initialLeftCityKey={leftCity.key}
          initialRightCityKey={rightCity.key}
          onCitySelectionChange={handleCitySelectionChange}
        />
      </div>
      
      <CityMaps 
        cities={[leftCity, rightCity] as [CityLocation, CityLocation]}
        cityKeys={[leftCity.key, rightCity.key] as [string, string]}
        key={`${leftCity.key}-${rightCity.key}`} // Add key to force re-render on change
      />
    </>
  );
}