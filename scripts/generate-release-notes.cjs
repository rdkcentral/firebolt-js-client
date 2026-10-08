const fs = require("node:fs");
const { execFileSync, spawnSync } = require("node:child_process");

 const tagPattern = /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
 const scopes = ["api", "webkit", "tooling"];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function releaseDistance(tag) {
  const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", tag, "HEAD"]);
  if (ancestor.status === 1) return null;
  if (ancestor.status !== 0) {
    throw new Error(`Unable to check whether ${tag} is reachable from HEAD`);
  }
  return Number(git(["rev-list", "--first-parent", "--count", `${tag}..HEAD`]));
}

function selectPreviousRelease(releases, distanceForTag) {
  const candidates = releases
    .filter((release) => !release.draft && release.published_at && tagPattern.test(release.tag_name))
    .map((release) => ({ release, distance: distanceForTag(release.tag_name) }))
    .filter((candidate) => candidate.distance !== null)
    .sort((left, right) => left.distance - right.distance);

  if (candidates.length === 0) {
    throw new Error("No reachable published, non-draft v<semver> release was found");
  }
  return candidates[0].release;
}

function parsePullRequestTitle(title) {
  const match = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/i.exec(title);
  if (!match || !match[2] || !scopes.includes(match[2])) return null;
  return {
    type: match[1].toLowerCase(),
    scope: match[2],
    breaking: Boolean(match[3]),
    subject: match[4],
  };
}

function uniquePullRequests(pullRequests) {
  const seen = new Set();
  return pullRequests.filter((pullRequest) => {
    if (!pullRequest.merged_at || seen.has(pullRequest.number)) return false;
    seen.add(pullRequest.number);
    return true;
  });
}

function renderReleaseNotes({ version, previousTag, currentTag, repository, pullRequests, date }) {
  const compareUrl = `https://github.com/${repository}/compare/${previousTag}...${currentTag}`;
  const groups = new Map([
    ["api", []],
    ["webkit", []],
    ["tooling", []],
    ["uncategorized", []],
  ]);

  for (const pullRequest of uniquePullRequests(pullRequests)) {
    const parsed = parsePullRequestTitle(pullRequest.title);
    const entry = parsed
      ? `- **${parsed.type}${parsed.breaking ? "!" : ""}** ${parsed.subject} ([#${pullRequest.number}](${pullRequest.html_url}))`
      : `- ${pullRequest.title} ([#${pullRequest.number}](${pullRequest.html_url}))`;
    groups.get(parsed ? parsed.scope : "uncategorized").push(entry);
  }

  const sections = [
    ["api", "API"],
    ["webkit", "WebKit"],
    ["tooling", "Tooling"],
    ["uncategorized", "Uncategorized"],
  ]
    .filter(([key]) => groups.get(key).length > 0)
    .map(([key, heading]) => `### ${heading}\n\n${groups.get(key).join("\n")}`);

  return [
    `# [${version}](${compareUrl}) (${date})`,
    "",
    ...sections.flatMap((section) => [section, ""]),
  ].join("\n").trimEnd() + "\n";
}

async function requestJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API request failed (${response.status}): ${url}`);
  return response.json();
}

async function listReleases({ apiUrl, repository, token }) {
  const releases = [];
  for (let page = 1; ; page += 1) {
    const results = await requestJson(
      `${apiUrl}/repos/${repository}/releases?per_page=100&page=${page}`,
      token,
    );
    if (!results) throw new Error("Unable to list GitHub Releases");
    releases.push(...results);
    if (results.length < 100) return releases;
  }
}

async function pullRequestsForCommit({ apiUrl, repository, token, sha }) {
  const associated = await requestJson(
    `${apiUrl}/repos/${repository}/commits/${sha}/pulls`,
    token,
  );
  const mergedPullRequests = (associated ?? []).filter(
    (pullRequest) => pullRequest?.merged_at,
  );
  if (mergedPullRequests.length > 0) {
    return mergedPullRequests;
  }

  const subject = git(["show", "-s", "--format=%s", sha]);
  const match = /(?:Merge pull request #|\(#)(\d+)/.exec(subject);
  if (!match) return [];
  const pullRequest = await requestJson(
    `${apiUrl}/repos/${repository}/pulls/${match[1]}`,
    token,
  );
  return pullRequest?.merged_at ? [pullRequest] : [];
}

async function collectPullRequests({ apiUrl, repository, token, commitShas }) {
  const pullRequests = [];
  for (const sha of commitShas) {
    pullRequests.push(...await pullRequestsForCommit({ apiUrl, repository, token, sha }));
  }
  return uniquePullRequests(pullRequests);
}

async function main() {
  const version = process.env.RELEASE_VERSION;
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!version || !repository || !token) {
    throw new Error("RELEASE_VERSION, GITHUB_REPOSITORY, and GITHUB_TOKEN are required");
  }

  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const previousRelease = selectPreviousRelease(
    await listReleases({ apiUrl, repository, token }),
    releaseDistance,
  );
  const currentTag = `v${version}`;
  const commitShas = git([
    "rev-list",
    "--first-parent",
    `${previousRelease.tag_name}..HEAD`,
  ]).split("\n").filter(Boolean);
  const pullRequests = await collectPullRequests({
    apiUrl,
    repository,
    token,
    commitShas,
  });
  if (pullRequests.length === 0) {
    throw new Error(`No merged pull requests found between ${previousRelease.tag_name} and HEAD`);
  }

  const releaseNotes = renderReleaseNotes({
    version,
    previousTag: previousRelease.tag_name,
    currentTag,
    repository,
    pullRequests,
    date: new Date().toISOString().slice(0, 10),
  });
  const body = process.env.DRY_RUN === "true"
    ? `> DRY RUN: This release was not published.\n\n${releaseNotes}`
    : releaseNotes;
  const notesPath = process.env.RELEASE_NOTES_PATH || "release-notes.md";
  fs.writeFileSync(notesPath, body);
  console.log(`Generated notes for ${pullRequests.length} merged pull requests since ${previousRelease.tag_name}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  parsePullRequestTitle,
  collectPullRequests,
  renderReleaseNotes,
  selectPreviousRelease,
  uniquePullRequests,
};