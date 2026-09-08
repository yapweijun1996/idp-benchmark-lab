# Input Modes

## Current implementation

The saved default is `canonical_images`. Gemini supports both modes in the current adapter. OpenAI and Custom OpenAI-compatible extraction paths require canonical images. Browser runtime dependencies render pages at scale 2 as PNG by default; production code wires this path through `browserExecuteDeps()`.

Capability overrides may exist in a Custom provider's settings, but the current extraction implementation still rejects non-canonical input. Do not use an override to claim native-PDF support without implementing and testing the request path.

## Native PDF

The provider receives the original PDF using its supported API path.

Use this to measure real-world provider-native document understanding.

## Canonical Rendered Images

The browser renders the PDF pages locally with fixed settings and sends the same page images to each vision provider.

Use this to improve fairness when comparing providers with different native PDF handling.

## Identity requirements

Record:
- input mode
- page count
- renderer scale/DPI-equivalent
- image format
- compression/quality if applicable
- page range

Do not combine Native PDF and Canonical Image results in one stability score.
