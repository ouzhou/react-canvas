/// <reference types="astro/client" />

interface ImportMetaEnv {
  /**
   * 完整 HTTP(S) 地址，需实现 AI SDK UI 消息流（与 `DefaultChatTransport` 兼容）。
   * 未设置时使用本地 Mock。
   */
  readonly PUBLIC_AI_CHAT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
