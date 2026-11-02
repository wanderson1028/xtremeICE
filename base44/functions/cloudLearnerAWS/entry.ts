import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { handleLearnerRequest } from "./handler.ts";
Deno.serve((req) => handleLearnerRequest(req, createClientFromRequest(req)));
