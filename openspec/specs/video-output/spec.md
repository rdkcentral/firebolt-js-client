---
module: VideoOutput
version: "9.0"
platform: both
stability: stable
description: |
  Provides access to video output configuration.
  Apps can query and subscribe to video output resolution changes.

properties:
  resolution:
    description: |
      Returns the current HDMI output resolution of the device.
    since: "8.0.0"
    result:
      $ref: "#/types/VideoResolution"
    examples:
      - description: Device output resolution is 4K
        result: "3840x2160"

types:
  VideoResolution:
    description: Video resolution output.
    properties:
      resolution:
        type: string
        description: |
          The current video resolution in format WIDTHxHEIGHT.
          Common values: "1920x1080", "3840x2160", "7680x4320"
---
