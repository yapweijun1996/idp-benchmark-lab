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
      reason: config.kind + " 适配器不支持原生 PDF 输入，请改用 Canonical Images 模式。",
    };
  }
  if (mode === "canonical_images" && !capabilities.imageInput) {
    return {
      supported: false,
      reason: config.kind + " 已配置为不支持图像输入，请改用 Native PDF 模式或调整其能力配置。",
    };
  }
  return { supported: true };
}
