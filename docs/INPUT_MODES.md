# Input Modes

## Current implementation

The saved default is `canonical_images`. Gemini supports both modes in the current adapter. OpenAI and Custom OpenAI-compatible extraction paths require canonical images. Browser runtime dependencies render pages at scale 2 as PNG by default; production code wires this path through `browserExecuteDeps()`.

Capability overrides may exist in a Custom provider's settings, but the current extraction implementation still rejects non-canonical input. Do not use an override to claim native-PDF support without implementing and testing the request path.

The `Gateway Demo` profile is a bounded Custom OpenAI-compatible Responses path.
It always uses canonical rendered images. Pages are sent sequentially in batches of
up to four images (4 MiB per image, 8 MiB total images, 12 MiB serialized body), so
documents larger than four pages remain selectable and use additional map requests
plus a text-only model reducer. The gateway quota and 800-output-token limit still
apply to every child request; local code performs no arithmetic or silent field
inference during reduction. The adapter compacts valid pretty-printed JSON contract
and schema blocks before image requests because the gateway also enforces an
input-token safety bound; it preserves all prompt instructions and fails closed when
a custom prompt still cannot fit.

## Native PDF

The provider receives the original PDF using its supported API path.

Use this to measure real-world provider-native document understanding.

## Canonical Rendered Images

The browser renders the PDF pages locally with fixed settings and sends the same page images to each vision provider.

Each suite freezes its rendered image bytes once before requests begin. Retries and concurrent runs reuse those exact images. The snapshot digest captures the pixels as well as render settings, so differences between browser renderers are visible in identity rather than silently assumed equivalent.

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
