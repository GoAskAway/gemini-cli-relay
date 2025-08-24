/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 获取当前项目的版本信息
 */
function getCurrentRelayVersion() {
  const packagePath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  return {
    version: packageJson.version,
    relay: packageJson.relay || {},
  };
}

/**
 * 解析 relay 版本号
 * 例如: "0.1.21-relay.2" → { upstream: "0.1.21", increment: 2 }
 */
function parseRelayVersion(version) {
  const match = version.match(/^(\d+\.\d+\.\d+)-relay\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid relay version format: ${version}`);
  }
  return {
    upstream: match[1],
    increment: parseInt(match[2], 10),
  };
}

/**
 * 获取上游最新稳定版本
 */
function getUpstreamStableVersion() {
  try {
    // 获取上游最新的稳定版本（排除 prerelease 和 nightly/preview）
    const releases = execSync(
      'gh api repos/google-gemini/gemini-cli/releases --jq "[.[] | select(.prerelease == false and (.tag_name | contains(\\"nightly\\") or contains(\\"preview\\")) | not)] | .[0].tag_name"',
    )
      .toString()
      .trim()
      .replace(/"/g, '');

    if (!releases || releases === 'null') {
      // 如果 API 失败，尝试从 git tags 获取
      const tags = execSync('git tag --list "v*.*.*" --sort=-v:refname')
        .toString()
        .split('\n');
      const latestStableTag = tags.find((tag) =>
        tag.match(/^v[0-9]+\.[0-9]+\.[0-9]+$/),
      );
      if (!latestStableTag) {
        throw new Error('Could not find a stable tag.');
      }
      return latestStableTag.replace(/^v/, '');
    }

    return releases.replace(/^v/, ''); // 移除 v 前缀
  } catch (error) {
    console.error('Failed to get upstream stable version:', error.message);
    throw error;
  }
}

/**
 * 检查是否有新的上游稳定版本
 */
function checkUpstreamUpdate() {
  const current = getCurrentRelayVersion();
  const currentParsed = parseRelayVersion(current.version);
  const upstreamLatest = getUpstreamStableVersion();

  return {
    current_upstream: currentParsed.upstream,
    latest_upstream: upstreamLatest,
    has_update: currentParsed.upstream !== upstreamLatest,
    current_increment: currentParsed.increment,
  };
}

/**
 * 生成下一个版本号
 */
function getNextRelayVersion(changeType = 'RELAY_FEATURE') {
  const current = getCurrentRelayVersion();

  if (changeType === 'UPSTREAM_SYNC') {
    const upstreamLatest = getUpstreamStableVersion();
    return {
      version: `${upstreamLatest}-relay.1`,
      upstream_version: upstreamLatest,
      relay_increment: 1,
      change_type: 'UPSTREAM_SYNC',
    };
  } else if (changeType === 'RELAY_FEATURE') {
    const parsed = parseRelayVersion(current.version);
    const nextIncrement = parsed.increment + 1;
    return {
      version: `${parsed.upstream}-relay.${nextIncrement}`,
      upstream_version: parsed.upstream,
      relay_increment: nextIncrement,
      change_type: 'RELAY_FEATURE',
    };
  } else {
    throw new Error(`Unknown change type: ${changeType}`);
  }
}

/**
 * 获取发布信息
 */
export function getRelayReleaseInfo() {
  const changeType = process.env.RELAY_CHANGE_TYPE || 'RELAY_FEATURE';
  const forceVersion = process.env.RELAY_FORCE_VERSION;

  if (forceVersion) {
    const parsed = parseRelayVersion(forceVersion);
    return {
      version: forceVersion,
      upstream_version: parsed.upstream,
      relay_increment: parsed.increment,
      change_type: 'MANUAL',
    };
  }

  const upstreamCheck = checkUpstreamUpdate();

  if (changeType === 'AUTO' && upstreamCheck.has_update) {
    console.error(
      `Upstream update detected: ${upstreamCheck.current_upstream} → ${upstreamCheck.latest_upstream}`,
    );
    return getNextRelayVersion('UPSTREAM_SYNC');
  }

  return getNextRelayVersion(changeType);
}

// CLI 入口
if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    const command = process.argv[2];

    switch (command) {
      case 'check':
        console.log(JSON.stringify(checkUpstreamUpdate(), null, 2));
        break;
      case 'next': {
        const releaseInfo = getRelayReleaseInfo();
        console.log(JSON.stringify(releaseInfo, null, 2));
        break;
      }
      case 'current':
        console.log(JSON.stringify(getCurrentRelayVersion(), null, 2));
        break;
      default: {
        // 默认输出发布信息（兼容原有脚本调用）
        const info = getRelayReleaseInfo();
        console.log(JSON.stringify(info));
        break;
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
