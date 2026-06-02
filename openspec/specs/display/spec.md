---
module: Display
version: "9.0"
platform: web
stability: stable
description: |
  Provides access to display capabilities.
  This module is only available in web/JS environments.

actions:
  colorimetry:
    description: Returns the colorimetry settings of the attached display.
    since: "9.0.0"
    result:
      $ref: "#/types/ColorimetryValue"
    examples:
      - description: Display supports standard color gamut
        result: "SDR"

  videoResolutions:
    description: Returns a list of video resolutions supported by the display.
    since: "9.0.0"
    result:
      type:
        - $ref: "#/types/VideoResolution"
    examples:
      - description: Display supports 4K and 1080p
        result:
          - "3840x2160"
          - "1920x1080"

types:
  ColorimetryValue:
    kind: enum
    description: Colorimetry standard.
    values:
      - id: "SDR"
        description: Standard dynamic range
      - id: "HDR"
        description: High dynamic range

  VideoResolution:
    kind: enum
    description: Video resolution.
    values:
      - id: "1920x1080"
        description: Full HD
      - id: "3840x2160"
        description: 4K
      - id: "7680x4320"
        description: 8K
---
