---
module: Discovery
version: "9.0"
stability: stable
description: |
  Allows apps to signal content consumption events back to the platform.
  The platform uses these signals for recommendations, parental controls,
  and watch history.

types:
  AgePolicy:
    kind: enum
    description: |
      Age-rating classification applied by the app to the content being reported.
      Values follow the "namespace:tier" convention. The app — not the platform —
      sets the age policy.
    values:
      - id: "app:adult"
        description: Adult-rated content
      - id: "app:child"
        description: Children's content
      - id: "app:teen"
        description: Teen-rated content

actions:
  watched:
    description: |
      Notify the platform that content has been partially or completely watched.
      watchedOn must be ISO 8601 UTC: "YYYY-MM-DDThh:mm:ss.sssZ"
      agePolicy is set by the app to classify the content being reported.
      Valid agePolicy values: "app:adult", "app:child", "app:teen"
    since: "8.0.0"
    params:
      - name: entityId
        type: string
        required: true
        description: Platform entity ID of the content being reported
      - name: progress
        type: double
        required: false
        description: Playback progress as a value from 0.0 (start) to 1.0 (end)
      - name: completed
        type: bool
        required: false
        description: True if the content was watched to completion
      - name: watchedOn
        type: string
        format: date-time
        required: false
        description: ISO 8601 UTC timestamp of when the content was watched
      - name: agePolicy
        type:
          $ref: AgePolicy
        required: false
        description: Age policy applied by the app to this content
    result: none
    examples:
      - description: Report partial watch with adult age policy
        params:
          entityId: "entity-12345"
          progress: 0.75
          completed: false
          watchedOn: "2026-05-27T14:30:00.000Z"
          agePolicy: "app:adult"
        result: null
---
