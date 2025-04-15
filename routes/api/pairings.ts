import { Handlers } from "$fresh/server.ts";
import { createPairing, getAllPairings, LocationPairing } from "../../utils/kv.ts";

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
      const body: LocationPairing = await req.json();
      
      // Validate the request body
      if (!body.seattle || !body.portland || 
          !body.seattle.coordinates || !body.portland.coordinates ||
          !Array.isArray(body.seattle.coordinates) || !Array.isArray(body.portland.coordinates) ||
          body.seattle.coordinates.length !== 2 || body.portland.coordinates.length !== 2) {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Create the pairing in KV store
      const result = await createPairing(body);
      
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating pairing:", error);
      return new Response(JSON.stringify({ error: "Failed to create pairing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
};