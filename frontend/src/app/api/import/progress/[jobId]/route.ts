const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
): Promise<Response> {
  const backendResponse = await fetch(`${BACKEND_URL}/api/import/progress/${params.jobId}`, {
    headers: { Accept: "text/event-stream" },
    cache: "no-store",
  });

  const { readable, writable } = new TransformStream();

  if (backendResponse.body) {
    backendResponse.body.pipeTo(writable).catch(() => {});
  }

  return new Response(readable, {
    status: backendResponse.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
