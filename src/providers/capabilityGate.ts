import type { InputMode, ProviderConfig } from "../storage/types";
import type { ProviderAdapter } from "./types";

export interface ModeSupport {
  supported: boolean;
  /** 不支持时的用户可读原因。 */
  reason?: string;
}

/**
 * 前置能力校验：在运行提交前判断所选 provider 与输入模式是否兼容。
 * 运行时的适配器校验（execute.ts）保持不变，作为第二道防线。
 */
export function checkModeSupport(
  adapter: ProviderAdapter,
  config: ProviderConfig,
  mode: InputMode,
): ModeSupport {
  const capabilities = adapter.capabilities(config);
  if (mode === "native_pdf" && !capabilities.nativePdf) {
    return {
      supported: false,
      reason: config.kind + " does not support native PDF input — choose \"Render pages as images\" instead.",
    };
  }
  if (mode === "canonical_images" && !capabilities.imageInput) {
    return {
      supported: false,
      reason: config.kind + " is configured without image-input support — choose \"Send original PDF\" instead, or update its capabilities.",
    };
  }
  return { supported: true };
}
