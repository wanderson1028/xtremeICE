import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { handleProxmoxLearner } from "./handler.js";

Deno.serve(req => handleProxmoxLearner(req, createClientFromRequest));