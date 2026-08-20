---
module: Metrics
version: "9.0"
platform: both
stability: stable
description: |
  Provides event logging to the platform for metrics and analytics.
  Apps send telemetry events describing media playback, errors, and lifecycle.

actions:
  ready:
    description: Signals that the app is ready to display content and accept user input.
    since: "9.0.0"
    params: []
    result: null

  startContent:
    description: Signals the app is starting to show video or audio content.
    since: "9.0.0"
    params: []
    result: null

  stopContent:
    description: Signals the app has stopped showing video or audio content.
    since: "9.0.0"
    params: []
    result: null

  page:
    description: |
      Signals that the app has transitioned to a new page.
      The pageName parameter identifies the page.
    since: "9.0.0"
    params:
      - name: pageName
        type: string
        required: true
        description: Identifier for the page the app is now on

  error:
    description: Logs an error that occurred within the app.
    since: "9.0.0"
    params:
      - name: errorType
        type: $ref: "#/types/ErrorType"
        required: true
        description: Type of error
      - name: errorMessage
        type: string
        required: false
        description: Human-readable error description

  mediaLoadStart:
    description: Signals that the app has started loading media content.
    since: "9.0.0"
    params: []
    result: null

  mediaPlay:
    description: Signals that media playback has begun.
    since: "9.0.0"
    params: []
    result: null

  mediaPlaying:
    description: |
      Signals that media is actively playing
      (distinguishes from play intent, e.g., after buffering).
    since: "9.0.0"
    params: []
    result: null

  mediaPause:
    description: Signals that media playback has been paused.
    since: "9.0.0"
    params: []
    result: null

  mediaWaiting:
    description: Signals that media playback is waiting (buffering) for data.
    since: "9.0.0"
    params: []
    result: null

  mediaSeeking:
    description: Signals that the user is seeking to a new playback position.
    since: "9.0.0"
    params: []
    result: null

  mediaSeeked:
    description: Signals that the user has completed seeking to a new position.
    since: "9.0.0"
    params: []
    result: null

  mediaRateChanged:
    description: Signals that media playback rate has changed (e.g., speed up, slow down).
    since: "9.0.0"
    params: []
    result: null

  mediaRenditionChanged:
    description: Signals that media rendition (quality) has changed.
    since: "9.0.0"
    params: []
    result: null

  mediaEnded:
    description: Signals that media playback has ended.
    since: "9.0.0"
    params: []
    result: null

  event:
    description: |
      Generic event telemetry allowing apps to log custom metrics and analytics events.
    since: "9.0.0"
    params:
      - name: eventName
        type: string
        required: true
        description: Event name identifier
      - name: eventData
        type: string
        required: false
        description: Arbitrary event data as a JSON string

  appInfo:
    description: |
      Sends app-specific metrics to the platform.
      Params include agePolicy indicating content maturity if applicable.
    since: "9.0.0"
    params:
      - name: agePolicy
        $ref: "Shared.AgePolicy"
        required: false
        description: Content age policy/rating

types:
  ErrorType:
    kind: enum
    description: Classification of error type.
    values:
      - id: "network"
        description: Network-related error
      - id: "playback"
        description: Media playback error
      - id: "entitlement"
        description: Content entitlement/auth error
      - id: "parse"
        description: Parsing or format error
      - id: "aborted"
        description: Request was aborted by user or app
      - id: "unknown"
        description: Unknown or uncategorized error
---
