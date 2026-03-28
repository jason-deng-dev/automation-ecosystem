import { runReAuth } from "@/app/lib/xhsController";
export const runtime = 'nodejs'

// Spawn xhs-login.js via docker exec, begin screenshot polling
export async function POST(request) { 
    runReAuth();
 }

// SSE — streams screenshots from login browser for QR code display
// export async function GET(request) { ... }
