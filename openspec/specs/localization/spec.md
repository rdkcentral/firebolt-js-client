---
module: Localization
version: "9.0"
platform: both
stability: stable
description: |
  Provides access to locale and regional settings managed by the platform.
  Apps subscribe to events to receive real-time updates when settings change.

events:
  onCountryChanged:
    description: |
      Fires when the platform's active country setting changes.
      The payload is an ISO 3166-1 alpha-2 country code (e.g. "US", "GB", "DE").
      Corresponds to the Country field in the Devices table.
    since: "9.0.0"
    payload:
      type: string
      minLength: 2
      maxLength: 2
      pattern: "^[A-Z]{2}$"
      description: ISO 3166-1 alpha-2 country code
    examples:
      - description: Country changed to United States
        payload: "US"
---
