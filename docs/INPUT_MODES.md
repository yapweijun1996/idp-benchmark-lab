# Input Modes

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
