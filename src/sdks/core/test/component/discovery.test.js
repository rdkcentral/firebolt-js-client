/**
 * Copyright 2026 Comcast Cable Communications Management, LLC
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
import { Discovery } from '../../build/javascript/src/firebolt.mjs';

describe("Discovery API", () => {

  test("Discovery.watched()", async () => {
    const result = await Discovery.watched("partner.com/entity/123", 0.95, true, "2021-04-23T18:25:43.511Z");
    expect(result).toBe(true);
  });
});
