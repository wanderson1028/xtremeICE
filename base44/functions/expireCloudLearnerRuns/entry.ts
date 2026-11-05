import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { handleExpiryRequest } from "./handler.ts";
Deno.serve(req=>handleExpiryRequest(createClientFromRequest(req)));
