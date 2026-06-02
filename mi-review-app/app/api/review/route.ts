import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return new Response(JSON.stringify({ ok: true, message: "Funciona" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
