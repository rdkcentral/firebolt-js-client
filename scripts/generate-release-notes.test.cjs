const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const yaml = require("js-yaml");

const {
  collectPullRequests,
  parsePullRequestTitle,
  renderReleaseNotes,
  selectPreviousRelease,
  uniquePullRequests,
} = require("./generate-release-notes.cjs");

function pullRequest(number, title, merged = true) {
  return {
    number,
    title,
    merged_at: merged ? "2026-10-01T12:00:00Z" : null,
    html_url: `https://github.com/rdkcentral/firebolt-js-client/pull/${number}`,
  };
}

test("selects the closest reachable published v-tag and excludes draft dry runs", () => {
  const releases = [
    { tag_name: "v1.0.0-next.5", draft: false, published_at: "2026-02-23T00:00:00Z" },
    { tag_name: "v1.0.0", draft: false, published_at: "2026-09-28T00:00:00Z" },
    { tag_name: "test-v1.2.0", draft: true, published_at: "2026-10-01T00:00:00Z" },
    { tag_name: "v2.0.0", draft: false, published_at: "2026-10-02T00:00:00Z" },
  ];
  const distance = { "v1.0.0-next.5": 40, "v1.0.0": 5, "v2.0.0": null };

  assert.equal(
    selectPreviousRelease(releases, (tag) => distance[tag] ?? null).tag_name,
    "v1.0.0",
  );
});

test("accepts published prereleases as release boundaries", () => {
  const releases = [
    { tag_name: "v1.1.0-rc", draft: false, published_at: "2026-10-01T00:00:00Z" },
    { tag_name: "v1.0.0", draft: false, published_at: "2026-09-28T00:00:00Z" },
  ];

  assert.equal(selectPreviousRelease(releases, () => 1).tag_name, "v1.1.0-rc");
});

test("fails when no valid published release is reachable", () => {
  assert.throws(
    () => selectPreviousRelease([
      { tag_name: "test-v1.1.0", draft: true, published_at: "2026-10-01T00:00:00Z" },
    ], () => null),
    /No reachable published/,
  );
});

test("recognizes only the configured categorized title scopes", () => {
  assert.deepEqual(parsePullRequestTitle("feat(api): Add a device method"), {
    type: "feat",
    scope: "api",
    breaking: false,
    subject: "Add a device method",
  });
  assert.deepEqual(parsePullRequestTitle("feat(webkit)!: Replace transport"), {
    type: "feat",
    scope: "webkit",
    breaking: true,
    subject: "Replace transport",
  });
  assert.equal(parsePullRequestTitle("feat(unknown): Add a thing"), null);
  assert.equal(parsePullRequestTitle("feat: Add a thing"), null);
});

test("deduplicates PRs and excludes unmerged requests", () => {
  const first = pullRequest(12, "fix(api): Handle null state");
  assert.deepEqual(
    uniquePullRequests([first, first, pullRequest(13, "feat(tooling): Add test", false)]),
    [first],
  );
});

test("deduplicates a PR associated with multiple commits", async () => {
  const originalFetch = global.fetch;
  const associated = pullRequest(31, "fix(api): Handle duplicate commit association");
  let requests = 0;
  global.fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify([associated]), { status: 200 });
  };

  try {
    const result = await collectPullRequests({
      apiUrl: "https://api.github.com",
      repository: "rdkcentral/firebolt-js-client",
      token: "test-token",
      commitShas: ["commit-one", "commit-two"],
    });
    assert.equal(requests, 2);
    assert.deepEqual(result.map((item) => item.number), [31]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("release workflow aligns v tags and package SemVer on GitHub Packages", () => {
  const workflow = yaml.load(fs.readFileSync(".github/workflows/release-types.yml", "utf8"));
  const steps = workflow.jobs["release-types"].steps;
  const setupNode = steps.find((step) => step.uses === "actions/setup-node@v4");
  const packageVersion = steps.find((step) => step.name === "Update package version");
  const createTag = steps.find((step) => step.name === "Create git tag");
  const createRelease = steps.find((step) => step.name === "Create GitHub Release");

  assert.equal(setupNode.with["registry-url"], "https://npm.pkg.github.com");
  assert.match(packageVersion.run, /npm version \"\$VERSION\"/);
  assert.match(createTag.run, /TAG_NAME=\"v\$\{VERSION\}\"/);
  assert.equal(createRelease.with.tag_name, "v${{ inputs.version }}");
  assert.equal(createRelease.with.prerelease, "${{ contains(inputs.version, '-rc') }}");
});

test("renders categorized PR notes once and preserves legacy titles", () => {
  const notes = renderReleaseNotes({
    version: "1.1.0",
    previousTag: "v1.0.0",
    currentTag: "v1.1.0",
    repository: "rdkcentral/firebolt-js-client",
    date: "2026-10-08",
    pullRequests: [
      pullRequest(25, "feat(api): Add device capabilities"),
      pullRequest(26, "fix(webkit): Reconnect after timeout"),
      pullRequest(27, "docs(tooling): Clarify setup"),
      pullRequest(28, "Update release pipeline"),
      pullRequest(25, "feat(api): Add device capabilities"),
    ],
  });

  assert.match(notes, /compare\/v1\.0\.0\.\.\.v1\.1\.0/);
  assert.match(notes, /### API[\s\S]*\*\*feat\*\* Add device capabilities/);
  assert.match(notes, /### WebKit[\s\S]*\*\*fix\*\* Reconnect after timeout/);
  assert.match(notes, /### Tooling[\s\S]*\*\*docs\*\* Clarify setup/);
  assert.match(notes, /### Uncategorized[\s\S]*Update release pipeline/);
  assert.equal((notes.match(/#25/g) || []).length, 1);
});