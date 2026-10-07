import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { testProviderConnection } from "@/lib/ai/service";
import { handleRouteError, jsonError } from "@/lib/http";
import { providerTestSchema } from "@/lib/validators";
import type { ProviderKey } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();
    const { provider } = providerTestSchema.parse(await request.json());
    const result = await testProviderConnection(provider as ProviderKey);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}
