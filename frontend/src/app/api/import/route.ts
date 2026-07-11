import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";


export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();

  try {
    const response = await fetch(`${BACKEND_URL}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Could not reach the import service. Please try again shortly.",
        },
      },
      { status: 502 },
    );
  }
}
