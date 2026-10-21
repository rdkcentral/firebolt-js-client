---
module: Window
version: "9.0"
platform: web
stability: stable
description: |
  Provides key interception capabilities for web-based apps.
  Apps can register to receive specific key events even when not in focus,
  as long as they are in the Active lifecycle state.

  The intercept set is initially empty when an app becomes active.
  Both methods will return an error if called when the app is not in the Active lifecycle state.

actions:
  - name: addKeyIntercepts
    description: |
      Adds the supplied list of keys to the set of keys that are received by this app
      when it is in the Active lifecycle state but not in focus.
      The key is represented by the JS event.key attribute defined in the
      Firebolt Key Codes Specification.

      No-op if a key is already in the intercept set.
      Validation is performed by the server, not the client library.

      Returns an error if called when the app is not in the Active lifecycle state.
    since: "9.0.0"
    params:
      - name: keys
        type: array
        items: string
        required: true
        description: List of one or more key identifiers, unordered
    result: null
    examples:
      - description: Add keys to intercept set
        params:
          keys:
            - "Key1"
            - "Key2"
        result: null

  - name: removeKeyIntercepts
    description: |
      Removes the supplied list of keys from the set of keys that are received by this app
      when it is in the Active lifecycle state but not in focus.
      The key is represented by the JS event.key attribute defined in the
      Firebolt Key Codes Specification.

      No-op if a key is not in the intercept set.
      Validation is performed by the server, not the client library.

      Returns an error if called when the app is not in the Active lifecycle state.
    since: "9.0.0"
    params:
      - name: keys
        type: array
        items: string
        required: true
        description: List of one or more key identifiers, unordered
    result: null
    examples:
      - description: Remove keys from intercept set
        params:
          keys:
            - "Key1"
            - "Key2"
        result: null
---
