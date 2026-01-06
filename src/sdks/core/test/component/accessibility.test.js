/**
 * Copyright 2025 Comcast Cable Communications Management, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import "./utils/bootstrap.mjs";

import { test, expect, describe } from "@jest/globals";
import { Accessibility } from '../../build/javascript/src/firebolt';

describe("Accessibility API", () => {
  test("audioDescription returns boolean true", async () => {
    await expect(Accessibility.audioDescription()).resolves.toBe(true);
  });

  test("closedCaptionsSettings returns expected structure", async () => {
    const result = await Accessibility.closedCaptionsSettings();

    expect(result).toHaveProperty("enabled", true);
    expect(result).toHaveProperty("preferredLanguages");
    expect(result.preferredLanguages).toEqual(["eng", "spa"]);
  });

  test("highContrastUI returns boolean true", async () => {
    await expect(Accessibility.highContrastUI()).resolves.toBe(true);
  });

  test("voiceGuidanceSettings returns expected structure", async () => {
    const result = await Accessibility.voiceGuidanceSettings();

    expect(result).toMatchObject({
      enabled: true,
      navigationHints: true,
      rate: 0.8,
    });
  });
});
