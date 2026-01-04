import { NextResponse } from "next/server";

// ===========================================
// Health Check API Route
// ===========================================

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 */
export async function GET() {
  const healthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    checks: {
      api: true,
      envio: await checkEnvioConnection(),
    },
  };

  // If any check fails, return 503
  const allHealthy = Object.values(healthCheck.checks).every(Boolean);

  return NextResponse.json(healthCheck, {
    status: allHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

/**
 * Check if Envio GraphQL endpoint is reachable
 */
async function checkEnvioConnection(): Promise<boolean> {
  const envioUrl = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL;

  if (!envioUrl) {
    return false;
  }

  try {
    const response = await fetch(envioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ __typename }",
      }),
      // 5 second timeout
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    return false;
  }
}
