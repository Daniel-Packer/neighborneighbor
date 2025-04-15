import { Handlers } from "$fresh/server.ts";
import { createPairing, getAllPairings, deletePairing } from "../../utils/kv.ts";

export const handler: Handlers = {
  // GET endpoint to retrieve all pairings
  async GET(_req) {
    try {
      const pairings = await getAllPairings();
      return new Response(JSON.stringify(pairings), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error retrieving pairings:", error);
      return new Response(JSON.stringify({ error: "Failed to retrieve pairings" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  // POST endpoint to create a new pairing
  async POST(req) {
    try {
      const body = await req.json();
      
      // Validate the request body - now checking dynamically for any city keys
      if (!body || typeof body !== "object") {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Ensure createdAt exists
      if (!body.createdAt) {
        body.createdAt = new Date().toISOString();
      }
      
      // Check for at least 2 city entries with valid coordinates
      const cityEntries = Object.entries(body).filter(([key, value]) => 
        key !== "createdAt" && 
        value && 
        typeof value === "object" && 
        "coordinates" in value &&
        Array.isArray(value.coordinates) &&
        value.coordinates.length === 2
      );
      
      if (cityEntries.length < 2) {
        return new Response(JSON.stringify({ 
          error: "At least two cities with valid coordinates are required" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Create the pairing
      const result = await createPairing(body);
      
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      console.error("Error creating pairing:", error);
      return new Response(JSON.stringify({ error: "Failed to create pairing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  
  // DELETE endpoint to remove a pairing
  async DELETE(req) {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing pairing ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      await deletePairing(id);
      
      return new Response(JSON.stringify({ success: true, id }), {
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error) {
      console.error("Error deleting pairing:", error);
      return new Response(JSON.stringify({ error: "Failed to delete pairing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
};