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

import apis from './apis.mjs'
import capabilities from './capabilities.mjs'

import nopt from 'nopt'
import path from 'path'
import { readFile, writeFile } from 'fs/promises'

const loadJson = file => readFile(file).then(data => JSON.parse(data.toString()))

const knownOpts = {
    'capabilities': [Boolean],
    'legacy-support': [Number],
    'source': [String],
    'report': [Boolean]
}

const defaultOpts = {
    'capabilities': true,
    'legacy-versions': 2,
    'source': './src/json/firebolt-specification.json',
    'report': false
}

const shortHands = {
    'l': '--legacy-versions',
    'c': '--capabilities',
    't': '--target',
    's': '--source',
    'r': '--report'
}
  
// Last 2 arguments are the defaults.
const parsedArgs = Object.assign(defaultOpts, nopt(knownOpts, shortHands, process.argv, 2))

const signOff = () => console.log('\nThis has been a presentation of \x1b[38;5;202mFirebolt\x1b[0m \u{1F525} \u{1F529}\n')

let version = await loadJson(parsedArgs.source)

version = await apis(version, parsedArgs)
version = await capabilities(version, parsedArgs)

if (!parsedArgs.report) {
    writeFile(path.join('.', 'dist', 'firebolt-specification.json'), JSON.stringify(version, null, '\t'))
}

signOff()
