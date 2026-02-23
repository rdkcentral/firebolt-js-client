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
import { Metrics } from '../../build/javascript/src/firebolt.mjs';


describe("Metrics API", () => {
  test("ready returns expected value", async () => {
    await expect(Metrics.ready()).resolves.toBe(
      true
    );
  });
  //we don't need to test signIn and signOut here since they're rpc-only

  test("startContent returns expected value", async () => {
    await expect(Metrics.startContent()).resolves.toBe(
      true
    );
  });
  test("stopContent returns expected value", async () => {
    await expect(Metrics.stopContent()).resolves.toBe(
      true
    );
  });
  test("page returns expected value", async () => {
    await expect(Metrics.page("home")).resolves.toBe(
      true
    );
  });
  test("error returns expected value", async () => {
    await expect(Metrics.error("media", "MEDIA-STALLED", "playback stalled", true)).resolves.toBe(
      true
    );
  });
  test("mediaLoadStart returns expected value", async () => {
    await expect(Metrics.mediaLoadStart("345")).resolves.toBe(
      true
    );
  });
  test("mediaPlay returns expected value", async () => {
    await expect(Metrics.mediaPlay("345")).resolves.toBe(
      true
    );
  });
  test("mediaPlaying returns expected value", async () => {
    await expect(Metrics.mediaPlaying("345")).resolves.toBe(
      true
    );
  });
  test("mediaPause returns expected value", async () => {
    await expect(Metrics.mediaPause("345")).resolves.toBe(
      true
    );
  });
  test("mediaWaiting returns expected value", async () => {
    await expect(Metrics.mediaWaiting("345")).resolves.toBe(
      true
    );
  });
  test("mediaSeeking returns expected value", async () => {
    await expect(Metrics.mediaSeeking("345", 0.5)).resolves.toBe(
      true
    );
  });
  test("mediaSeeked returns expected value", async () => {
    await expect(Metrics.mediaSeeked("345", 0.51)).resolves.toBe(
      true
    );
  });
  test("mediaRateChanged returns expected value", async () => {
    await expect(Metrics.mediaRateChanged("345", 2)).resolves.toBe(
      true
    );
  });
  test("mediaRenditionChanged returns expected value", async () => {
    await expect(Metrics.mediaRenditionChanged("345", 5000, 1920, 1080, "HDR+")).resolves.toBe(
      true
    );
  });
  test("mediaEnded returns expected value", async () => {
    await expect(Metrics.mediaEnded("345")).resolves.toBe(
      true
    );
  });
  test("event returns expected value", async () => {
    await expect(Metrics.event("http://meta.rdkcentral.com/some/schema", "foo")).resolves.toBe(
      true
    );
  });
  test("appInfo returns expected value", async () => {
    await expect(Metrics.appInfo("1.2.2")).resolves.toBe(
      null
    );
  });
});
