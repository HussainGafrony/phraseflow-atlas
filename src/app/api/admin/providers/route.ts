/**
 * قراءة إعدادات المزوّدين دون المفاتيح السرية، وحفظ المفاتيح مشفرة. ترك حقل المفتاح فارغاً يحافظ على المفتاح الحالي.
 */
import { NextResponse } from "next/server";
import { providerDefinitions } from "@/lib/ai/provider-definitions";
import { encryptSecret } from "@/lib/crypto";
import { dbConnect } from "@/lib/db";
import { requireApiSession } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { providerConfigSchema } from "@/lib/validators";
import { AIProvider } from "@/models/AIProvider";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();
    const saved = await AIProvider.find({}).lean();
    const savedMap = new Map(
      saved.map((provider) => [provider.provider, provider]),
    );

    return NextResponse.json({
      definitions: providerDefinitions,
      providers: providerDefinitions.map((definition, index) => {
        const provider = savedMap.get(definition.provider);
        return {
          provider: definition.provider,
          displayName: definition.displayName,
          enabled: provider?.enabled ?? false,
          priority: provider?.priority ?? index + 1,
          model: provider?.model || definition.defaultModel,
          baseUrl: provider?.baseUrl || definition.defaultBaseUrl,
          textEndpoint:
            provider?.textEndpoint || definition.defaultTextEndpoint,
          audioEndpoint:
            provider?.audioEndpoint || definition.defaultAudioEndpoint,
          hasApiKey: Boolean(provider?.encryptedApiKey),
        };
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    const body = providerConfigSchema.parse(await request.json());
    await dbConnect();

    for (const incoming of body.providers) {
      const update: Record<string, unknown> = {
        enabled: incoming.enabled,
        priority: incoming.priority,
        model: incoming.model,
        baseUrl: incoming.baseUrl,
        textEndpoint: incoming.textEndpoint,
        audioEndpoint: incoming.audioEndpoint,
      };

      if (incoming.apiKey) {
        update.encryptedApiKey = encryptSecret(incoming.apiKey);
      }

      await AIProvider.updateOne(
        { provider: incoming.provider },
        { $set: update },
        { upsert: true },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
