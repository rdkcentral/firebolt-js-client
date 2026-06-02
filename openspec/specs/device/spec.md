---
module: Device
version: "9.0"
platform: both
stability: stable
description: |
  Provides access to device information and capabilities.
  Apps can query device identifiers, class, and display capabilities.

actions:
  uid:
    description: Returns a persistent unique UUID for the current app and device.
    since: "8.0.0"
    result:
      type: string
      description: UUID that resets when app or device is reset
    examples:
      - description: Persistent app+device UUID
        result: "550e8400-e29b-41d4-a716-446655440000"

  deviceClass:
    description: Returns the class of the device.
    since: "9.0.0"
    result:
      $ref: "#/types/DeviceClass"
    examples:
      - description: Set-top box
        result: "stb"

properties:
  hdr:
    description: |
      Returns the HDR standards supported by the attached TV or integrated display.
    since: "8.0.0"
    result:
      $ref: "#/types/HdrCapabilities"
    examples:
      - description: HDR10 and Dolby Vision supported
        result:
          hdr10: true
          hdr10Plus: false
          dolbyVision: true
          hlg: false

  dolbyAtmosExperienceAvailable:
    description: |
      Returns whether the user would get a Dolby Atmos experience
      if a Dolby Atmos track were to be played at this time.
    since: "9.0.0"
    result:
      type: bool
    examples:
      - description: Dolby Atmos available
        result: true

types:
  DeviceClass:
    kind: enum
    description: Classification of the device.
    values:
      - id: "ott"
        description: No tuner/demod, no integrated display
      - id: "stb"
        description: With tuner/demod, no integrated display
      - id: "tv"
        description: Possibly tuner/demod, with integrated display

  HdrCapabilities:
    description: HDR format support flags.
    properties:
      hdr10:
        type: bool
        description: HDR10 support
      hdr10Plus:
        type: bool
        description: HDR10+ support
      dolbyVision:
        type: bool
        description: Dolby Vision support
      hlg:
        type: bool
        description: HLG (Hybrid Log-Gamma) support
---
