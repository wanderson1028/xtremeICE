import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { handleKasm } from "./handler.ts";

Deno.serve((request) => handleKasm(createClientFromRequest(request), request));
