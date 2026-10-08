/**
 * القيم الابتدائية وحقول مزوّدي النص. يستطيع الأدمن تغيير الموديل والمفتاح والمسار من الواجهة دون تعديل الكود.
 */
import type { ProviderKey } from "../constants";

export type ProviderField = {
  name: "apiKey" | "model" | "baseUrl" | "textEndpoint" | "audioEndpoint";
  label: string;
  type: "password" | "text" | "url";
  placeholder: string;
  helper: string;
};

export type ProviderDefinition = {
  provider: ProviderKey;
  displayName: string;
  defaultModel: string;
  defaultBaseUrl: string;
  defaultTextEndpoint: string;
  defaultAudioEndpoint: string;
  fields: ProviderField[];
};

const commonFields: ProviderField[] = [
  {
    name: "apiKey",
    label: "API key",
    type: "password",
    placeholder: "Paste provider API key",
    helper: "Stored encrypted when APP_ENCRYPTION_KEY is configured.",
  },
  {
    name: "model",
    label: "Model",
    type: "text",
    placeholder: "Model name",
    helper: "The model used to generate learning sentences.",
  },
  {
    name: "baseUrl",
    label: "Base URL",
    type: "url",
    placeholder: "https://api.provider.com",
    helper: "Provider API base URL.",
  },
  {
    name: "textEndpoint",
    label: "Text endpoint",
    type: "text",
    placeholder: "/chat/completions",
    helper: "Endpoint used for sentence generation.",
  },
  {
    name: "audioEndpoint",
    label: "Audio endpoint",
    type: "text",
    placeholder: "/audio/speech",
    helper: "Optional endpoint used once to create and save audio URLs.",
  },
];

export const providerDefinitions: ProviderDefinition[] = [
  {
    provider: "openai",
    displayName: "ChatGPT / OpenAI",
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultTextEndpoint: "/chat/completions",
    defaultAudioEndpoint: "/audio/speech",
    fields: commonFields,
  },
  {
    provider: "gemini",
    displayName: "Gemini",
    defaultModel: "gemini-1.5-flash",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultTextEndpoint: "/models/{model}:generateContent",
    defaultAudioEndpoint: "",
    fields: commonFields,
  },
  {
    provider: "claude",
    displayName: "Claude",
    defaultModel: "claude-3-5-sonnet-latest",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultTextEndpoint: "/messages",
    defaultAudioEndpoint: "",
    fields: commonFields,
  },
  {
    provider: "deepseek",
    displayName: "DeepSeek",
    defaultModel: "deepseek-chat",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultTextEndpoint: "/chat/completions",
    defaultAudioEndpoint: "",
    fields: commonFields,
  },
  {
    provider: "grok",
    displayName: "Grok",
    defaultModel: "grok-2-latest",
    defaultBaseUrl: "https://api.x.ai/v1",
    defaultTextEndpoint: "/chat/completions",
    defaultAudioEndpoint: "",
    fields: commonFields,
  },
];

export function getProviderDefinition(provider: ProviderKey) {
  return providerDefinitions.find(
    (definition) => definition.provider === provider,
  );
}
