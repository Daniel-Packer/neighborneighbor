// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $api_pairings from "./routes/api/pairings.ts";
import * as $greet_name_ from "./routes/greet/[name].tsx";
import * as $index from "./routes/index.tsx";
import * as $pairings_index from "./routes/pairings/index.tsx";
import * as $CityMapWrapper from "./islands/CityMapWrapper.tsx";
import * as $CityMaps from "./islands/CityMaps.tsx";
import * as $CitySelector from "./islands/CitySelector.tsx";
import * as $Map from "./islands/Map.tsx";
import * as $PairingControls from "./islands/PairingControls.tsx";
import type { Manifest } from "$fresh/server.ts";

const manifest = {
  routes: {
    "./routes/_404.tsx": $_404,
    "./routes/_app.tsx": $_app,
    "./routes/api/pairings.ts": $api_pairings,
    "./routes/greet/[name].tsx": $greet_name_,
    "./routes/index.tsx": $index,
    "./routes/pairings/index.tsx": $pairings_index,
  },
  islands: {
    "./islands/CityMapWrapper.tsx": $CityMapWrapper,
    "./islands/CityMaps.tsx": $CityMaps,
    "./islands/CitySelector.tsx": $CitySelector,
    "./islands/Map.tsx": $Map,
    "./islands/PairingControls.tsx": $PairingControls,
  },
  baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
