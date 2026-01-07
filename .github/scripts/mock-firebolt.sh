#!/usr/bin/env bash

# Copyright 2026 Comcast Cable Communications Management, LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0

set -e

echo "Building Mock-Firebolt..."
git clone --depth 1 --branch main https://github.com/rdkcentral/mock-firebolt.git "$MOCK_PATH"
cd "$MOCK_PATH"
git fetch --shallow-since=2025-11-01
git checkout "$MOCK_SHA1SUM"
git apply "$MOCK_PATCH"

cd server
npm install --no-audit --no-fund

cp "$GITHUB_WORKSPACE/.github/mock-firebolt/config.json" \
   "$MOCK_PATH/server/src/.mf.config.json"

npm start > mock-firebolt.log 2>&1 &
echo $! > mock-firebolt.pid

for i in {1..20}; do
  if grep -q "Welcome to Mock Firebolt" mock-firebolt.log; then
    echo "Mock-Firebolt is ready!"
    exit 0
  fi
  sleep 1
done

echo "Mock-Firebolt startup timed out"
exit 1
