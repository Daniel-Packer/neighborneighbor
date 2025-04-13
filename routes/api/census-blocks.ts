import { FreshContext } from "$fresh/server.ts";
import { read } from "npm:shapefile@0.6.6";
import { join } from "https://deno.land/std@0.220.1/path/mod.ts";

export const handler = async (_req: Request, _ctx: FreshContext): Promise<Response> => {
  try {
    // Get absolute path to the shapefile
    const dataPath = join(Deno.cwd(), "data/maps/nyc/nycb2020.shp");
    
    // Read the shapefile and convert to GeoJSON
    const source = await read(dataPath);
    const features = source.features;
    
    // Create a GeoJSON FeatureCollection
    const geoJson = {
      type: "FeatureCollection",
      features
    };
    
    return new Response(JSON.stringify(geoJson), {
      headers: {
        "Content-Type": "application/json",
        // Cache this response since it's a large static file
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error("Error reading shapefile:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: "Failed to load census block data", details: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};