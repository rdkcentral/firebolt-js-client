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
import { Advertising } from '../../build/javascript/src/firebolt';

describe("Advertising API", () => {
  test("advertisingId returns expected structure", async () => {
    const result = await Advertising.advertisingId();

    expect(result).toMatchObject({
      ifa: "bd87dd10-8d1d-4b93-b1a6-a8e5d410e400",
      ifa_type: "sspid",
      lmt: "0",
    });
  });
});

