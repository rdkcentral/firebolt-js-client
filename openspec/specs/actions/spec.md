---
module: Actions
version: "9.0"
platform: both
stability: stable
description: |
  Provides access to platform intent dispatch.
  Apps can send intents to the platform and receive the most recently received intent.

actions:
  start:
    description: Send an intent to the platform.
    since: "9.0.0"
    params:
      - name: intent
        type: string
        required: true
        description: The intent as a JSON document
      - name: handlerAppId
        type: string
        required: false
        description: The app ID to handle the intent (optional)
    result: null
    examples:
      - description: Send a play intent
        params:
          intent: '{"action":"play","entityId":"entity-123"}'

properties:
  intent:
    description: |
      Returns the intent that was most recently received from the platform.
      Getter is typically called by an app after transitioning to the active lifecycle state.
    since: "9.0.0"
    result:
      $ref: "#/types/IntentPayload"
    examples:
      - description: Recent intent received
        result:
          intentId: 1
          intent: '{"action":"play"}'

types:
  IntentPayload:
    description: Platform intent with unique ID and payload.
    properties:
      intentId:
        type: unsigned
        description: Monotonically increasing intent ID
      intent:
        type: string
        description: The intent as a JSON document
---
