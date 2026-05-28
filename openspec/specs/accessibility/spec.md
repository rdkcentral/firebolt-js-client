---
module: Accessibility
version: "9.0"
platform: both
stability: stable
description: |
  Provides access to platform accessibility settings.
  Apps can query current settings and subscribe to changes.

actions:
  voiceGuidanceSettings:
    description: |
      Returns the current voice guidance configuration.
      Voice guidance is a screen-reader feature that reads UI elements aloud.
    since: "9.0.0"
    result:
      $ref: "#/types/VoiceGuidanceSettings"
    examples:
      - description: Voice guidance enabled at normal rate
        result:
          enabled: true
          rate: 1.0
          navigationHints: true

types:
  VoiceGuidanceSettings:
    description: Current voice guidance configuration.
    properties:
      enabled:
        type: bool
        description: Whether voice guidance is active
      rate:
        type: double
        minimum: 0.1
        maximum: 10
        description: |
          Speech rate relative to the platform default.
          1.0 = normal speed, < 1.0 = slower, > 1.0 = faster.
      navigationHints:
        type: bool
        description: Whether navigation hints (element role announcements) are read aloud
---
