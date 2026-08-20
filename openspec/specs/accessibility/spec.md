---
module: Accessibility
version: "9.0"
platform: both
stability: stable
description: |
  Provides access to platform accessibility settings.
  Apps can query current settings and subscribe to changes.

properties:
  audioDescription:
    description: Returns the audio description setting of the device.
    since: "8.0.0"
    result:
      type: bool
    examples:
      - description: Audio description enabled
        result: true

  closedCaptionsSettings:
    description: |
      Returns captions settings: enabled, and a list of zero or more languages
      in order of decreasing preference.
    since: "8.0.0"
    result:
      $ref: "#/types/ClosedCaptionsSettings"
    examples:
      - description: Captions enabled with English and Spanish preferences
        result:
          enabled: true
          preferredLanguages:
            - "eng"
            - "spa"

  highContrastUI:
    description: Returns the high contrast UI device setting.
    since: "8.0.0"
    result:
      type: bool
    examples:
      - description: High contrast UI enabled
        result: true

  voiceGuidanceSettings:
    description: |
      Returns the current voice guidance configuration.
      Voice guidance is a screen-reader feature that reads UI elements aloud.
    since: "8.0.0"
    result:
      $ref: "#/types/VoiceGuidanceSettings"
    examples:
      - description: Voice guidance enabled at normal rate
        result:
          enabled: true
          rate: 1.0
          navigationHints: true

types:
  ClosedCaptionsSettings:
    description: Closed captions settings.
    properties:
      enabled:
        type: bool
        description: Whether captions are enabled
      preferredLanguages:
        type:
          - string
        description: |
          List of ISO 639-2/B language codes in order of user preference.
          Empty list if not initialized.

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
