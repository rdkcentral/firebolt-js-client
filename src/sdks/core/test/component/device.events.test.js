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

import { test } from '@jest/globals';

import {
  testSubscribeWithOneArgument,
  testListenWithOneArgument,
} from './utils/subscribeHelper.js';

import { Device } from '../../build/javascript/src/firebolt.mjs';

test('Device.onHdrChanged subscription', async () => {
  return testSubscribeWithOneArgument(Device, 'hdr', { "dolbyVision": true, "hdr10": true, "hdr10Plus": true, "hlg": true },
    '{"jsonrpc":"2.0","method":"Device.onHdrChanged","params":{"value":{ "dolbyVision": true, "hdr10": true, "hdr10Plus": true, "hlg": true }}}');
});

test('Device.dolbyAtmosExperienceAvailable subscription', async () => {
  return testSubscribeWithOneArgument(Device, 'dolbyAtmosExperienceAvailable', true,
    '{"jsonrpc":"2.0","method":"Device.onDolbyAtmosExperienceAvailableChanged","params":{"value":true}}');
});

test('Device.once: onDolbyAtmosExperienceAvailableChanged', async () => {
  return testListenWithOneArgument(Device, 'once', 'onDolbyAtmosExperienceAvailableChanged', true,
    '{"jsonrpc":"2.0","method":"Device.onDolbyAtmosExperienceAvailableChanged","params":{"value":true}}');
});

test('Device.listen: onDolbyAtmosExperienceAvailableChanged', async () => {
  return testListenWithOneArgument(Device, 'listen', 'onDolbyAtmosExperienceAvailableChanged', true,
    '{"jsonrpc":"2.0","method":"Device.onDolbyAtmosExperienceAvailableChanged","params":{"value":true}}');
});