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

import { test, expect } from "@jest/globals";
import { Metrics } from '../../build/javascript/src/firebolt';

test("Metrics ready() returns true", async () => {
  const res = await Metrics.ready();
  expect(res).toBe(true);
});
// Note: signIn and signOut are called by Discovery.signIn() and Discovery.signOut() respectively, so we don't need to test them here.
test("Metrics startContent() returns true", async () => {
  const res = await Metrics.startContent();
  expect(res).toBe(true);
});
test("Metrics stopContent() returns true", async () => {
  const res = await Metrics.stopContent();
  expect(res).toBe(true);
});
test("Metrics page() returns true", async () => {
  const res = await Metrics.page("home");
  expect(res).toBe(true);
});
test("Metrics error() returns true", async () => {
  const res = await Metrics.error( Metrics.ErrorType.MEDIA, "MEDIA-STALLED", "playback stalled", true);
  expect(res).toBe(true);
});
test("Metrics mediaLoadStart() returns true", async () => {
  const res = await Metrics.mediaLoadStart("345");
  expect(res).toBe(true);
});
test("Metrics mediaPlay() returns true", async () => {
  const res = await Metrics.mediaPlay("345");
  expect(res).toBe(true);
});
test("Metrics mediaPlaying() returns true", async () => {
  const res = await Metrics.mediaPlaying("345");
  expect(res).toBe(true);
});
test("Metrics mediaPause() returns true", async () => {
  const res = await Metrics.mediaPause("345");
  expect(res).toBe(true);
});
test("Metrics mediaWaiting() returns true", async () => {
  const res = await Metrics.mediaWaiting("345");
  expect(res).toBe(true);
});
test("Metrics mediaSeeking() returns true", async () => {
  const res = await Metrics.mediaSeeking("345", 0.50);
  expect(res).toBe(true);
});
test("Metrics mediaSeeked() returns true", async () => {
  const res = await Metrics.mediaSeeked("345", 0.51);
  expect(res).toBe(true);
});
test("Metrics mediaRateChanged() returns true", async () => {
  const res = await Metrics.mediaRateChanged("345", 2);
  expect(res).toBe(true);
});
test("Metrics mediaRenditionChanged() returns true", async () => {
  const res = await Metrics.mediaRenditionChanged("345", 5000, 1920, 1080, "HDR+");
  expect(res).toBe(true);
});
test("Metrics mediaEnded() returns true", async () => {
  const res = await Metrics.mediaEnded("345");
  expect(res).toBe(true);
});
/* 
//TODO event is not currently generated in the JS SDK, that is a bug that needs to be fixed.
test("Metrics event() returns true", async () => {
  const res = await Metrics.event("http://meta.rdkcentral.com/some/schema", "foo");
  expect(res).toBe(true);
});
*/
test("Metrics appInfo() returns null", async () => {
  const res = await Metrics.appInfo("1.2.2");
  expect(res).toBe(null);
});       