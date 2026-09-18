---
module: VideoOutput
version: "9.0"
platform: both
stability: stable
description: |
  Provides access to video output configuration.
  Apps can query and subscribe to video output resolution changes.

properties:
  - name: resolution
    description: |
      Returns the current HDMI output resolution of the device.
    since: "8.0.0"
    result:
      type:
        $ref: VideoResolution
    examples:
      - description: Device output resolution is 4K
        result: "3840x2160"

  - name: hdcp
    description: |
      Returns the current state of output protection on the video output.
      OTT/STB device: returns the negotiated HDCP version on the video output, or none if an encrypted connection has not been made between the OTT/STB device and any attached TV.
      TV device: returns direct.
    since: "9.0.0"
    result:
      type:
        $ref: HdcpType
    examples:
      - description: HDCP 2.2 negotiated
        result: "hdcp2.2"

events:
  - name: onHdcpChanged
    description: Event for when VideoOutput.hdcp changed.
    since: "9.0.0"
    params: []
    result:
      type:
        $ref: HdcpType
    examples:
      - description: HDCP state changed
        result: "hdcp1.4"

types:
  - name: VideoResolution
    description: Video resolution output.
    properties:
      - name: resolution
        type: string
        description: |
          The current video resolution in format WIDTHxHEIGHT.
          Common values: "1920x1080", "3840x2160", "7680x4320"

  - name: HdcpType
    kind: enum
    description: HDCP output protection state
    values:
      - id: "hdcp1.4"
        description: HDCP 1.4 negotiated
      - id: "hdcp2.2"
        description: HDCP 2.2 negotiated
      - id: "none"
        description: No encrypted connection established
      - id: "direct"
        description: Direct connection (TV device)
---
