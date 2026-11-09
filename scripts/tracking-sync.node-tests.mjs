import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { atomicWrite, emptyState, GitHub, readWorkstream, synchronize, validateConfiguration } from './sync-todos.mjs';

const original = JSON.parse(readFileSync(new URL('../.github/todo-sync.json', import.meta.url), 'utf8'));
const clone = (value) => structuredClone(value);
const source = (id = 'tracker-foundation', status = 'DONE') => `Workstream ID: ${id}
Title: Fictional ${id} fixture
Status: ${status}
Milestone: Verify the tracking contract
Dependencies: None
GitHub issue: pending
Purpose: Synthetic test data, not a real completion claim.

Tasks:
  [x] Exercise the actual synchronization boundary.

Acceptance criteria:
  Verify all three tracking surfaces and failure recovery.

Completion evidence:
  Synthetic fixture only.

Completion log:
  2026-11-06 - Define this isolated test.
`;

class FakeGitHub {
  constructor(config) {
    this.config = config; this.issues = []; this.items = []; this.writes = [];
  }
  async inventory() {
    return { repository: { full_name: this.config.repository }, issues: clone(this.issues), items: clone(this.items), sourceRevision: 'fixture' };
  }
  async listIssues() { return clone(this.issues); }
  async listItems() { return clone(this.items); }
  async getIssue(number) {
    const issue = this.issues.find((item) => item.number === number);
    assert.ok(issue, 'fake issue exists');
    return clone(issue);
  }
  async createIssue(title, body) {
    const number = this.issues.length + 1;
    const issue = {
      number, node_id: `issue-${number}`, title, body, state: 'open', state_reason: null,
      html_url: `https://github.com/${this.config.repository}/issues/${number}`,
    };
    this.issues.push(issue); this.writes.push('createIssue');
    return clone(issue);
  }
  async updateIssue(number, values) {
    Object.assign(this.issues.find((issue) => issue.number === number), values);
    this.writes.push('updateIssue'); return this.getIssue(number);
  }
  async addItem(issueId) {
    const item = { id: `item-${this.items.length + 1}`, content: { id: issueId }, status: null, isArchived: false };
    this.items.push(item); this.writes.push('addItem'); return clone(item);
  }
  async setStatus(itemId, optionId) {
    this.items.find((item) => item.id === itemId).status = { optionId };
    this.writes.push('setStatus');
  }
}

function fixture(t, ids = ['tracker-foundation']) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'careeros-tracking-test-'));
  t.after(() => rmSync(root, { recursive: true }));
  mkdirSync(path.join(root, 'TODO'));
  const config = clone(original);
  config.workstreams = ids.map((id) => clone(original.workstreams.find((entry) => entry.id === id)));
  config.excluded = [];
  for (const entry of config.workstreams) writeFileSync(path.join(root, entry.path), source(entry.id));
  const state = emptyState(config), api = new FakeGitHub(config);
  const options = { root, config, state, api };
  return {
    ...options,
    file: (id = ids[0]) => path.join(root, config.workstreams.find((entry) => entry.id === id).path),
    run: (extra = {}) => synchronize({ ...options, ...extra }),
  };
}

test('preview has no mutations/backlink changes; pilot and rerun verify all surfaces without churn', async (t) => {
  const f = fixture(t), before = readFileSync(f.file(), 'utf8');
  const preview = await f.run();
  assert.equal(preview.rows[0].outcome, 'planned');
  assert.equal(f.api.writes.length, 0);
  assert.equal(readFileSync(f.file(), 'utf8'), before);
  const pilot = await f.run({ apply: true });
  assert.equal(pilot.counts.verified, 1);
  assert.equal(pilot.counts.created, 1);
  assert.equal(f.api.issues[0].state_reason, 'completed');
  assert.equal(f.api.items[0].status.optionId, f.config.project.options.Done);
  assert.match(readFileSync(f.file(), 'utf8'), /GitHub issue: https:\/\/github.com\/Zanark\/CareerOS\/issues\/1/);
  const writes = f.api.writes.length, baseline = JSON.stringify(f.state);
  const rerun = await f.run({ apply: true });
  assert.equal(rerun.counts.reused, 1);
  assert.deepEqual(rerun.rows[0].actions, []);
  assert.equal(f.api.writes.length, writes);
  assert.equal(JSON.stringify(f.state), baseline);
});

test('completion, reopening, cancellation and supersession update state/reason and Project independently', async (t) => {
  const f = fixture(t);
  await f.run({ apply: true });
  for (const [status, state, reason, stage] of [
    ['IN_PROGRESS', 'open', null, 'In Progress'],
    ['IN_REVIEW', 'open', null, 'In review'],
    ['CANCELLED', 'closed', 'not_planned', 'Not planned'],
    ['SUPERSEDED', 'closed', 'not_planned', 'Not planned'],
    ['READY', 'open', null, 'Ready'],
    ['NOT_STARTED', 'open', null, 'Backlog'],
    ['DONE', 'closed', 'completed', 'Done'],
  ]) {
    writeFileSync(f.file(), readFileSync(f.file(), 'utf8').replace(/^Status:.*$/m, `Status: ${status}`));
    const result = await f.run({ apply: true });
    assert.equal(result.counts.verified, 1, JSON.stringify(result.rows));
    assert.equal(f.api.issues[0].state, state);
    assert.equal(f.api.issues[0].state_reason, reason);
    assert.equal(f.api.items[0].status.optionId, f.config.project.options[stage]);
  }
  assert.equal(f.api.issues.length, 1); assert.equal(f.api.items.length, 1);
});

test('blocked work keeps its explicit stage and blocker; composite status text is rejected', (t) => {
  const f = fixture(t);
  writeFileSync(f.file(), source().replace('Status: DONE', 'Status: BLOCKED\nBlocked stage: In Progress\nBlocker: Awaiting a fictional review.'));
  assert.equal(readWorkstream(f.root, f.config, f.config.workstreams[0]).stage, 'In Progress');
  writeFileSync(f.file(), source().replace('Status: DONE', 'Status: DONE locally; publication BLOCKED'));
  assert.throws(() => readWorkstream(f.root, f.config, f.config.workstreams[0]), /Unknown exact status/);
  writeFileSync(f.file(), source().replace('[x]', '[ ]'));
  assert.throws(() => readWorkstream(f.root, f.config, f.config.workstreams[0]), /unfinished tasks/);
});

test('notes outside managed boundaries survive updates; edited managed content conflicts', async (t) => {
  const f = fixture(t);
  await f.run({ apply: true });
  f.api.issues[0].body += '\nHuman notes: retain this decision.\n';
  writeFileSync(f.file(), readFileSync(f.file(), 'utf8').replace('Synthetic fixture only.', 'Synthetic fixture with a new result.'));
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  assert.match(f.api.issues[0].body, /Human notes: retain this decision/);
  f.api.issues[0].body = f.api.issues[0].body.replace('Synthetic fixture with a new result.', 'Human-edited managed result.');
  const before = clone(f.api.issues), writes = f.api.writes.length;
  assert.equal((await f.run({ apply: true })).counts.conflicts, 1);
  assert.deepEqual(f.api.issues, before); assert.equal(f.api.writes.length, writes);
});

test('unexpected title, issue state, Project status, archive and removed-item edits remain conflicts', async (t) => {
  const f = fixture(t);
  await f.run({ apply: true });
  const goodIssue = clone(f.api.issues[0]), goodItem = clone(f.api.items[0]);
  for (const change of [
    () => { f.api.issues[0].title = 'Human title'; },
    () => { f.api.issues[0].state = 'open'; f.api.issues[0].state_reason = null; },
    () => { f.api.items[0].status.optionId = f.config.project.options.Ready; },
    () => { f.api.items[0].isArchived = true; },
    () => { f.api.items = []; },
  ]) {
    f.api.issues = [clone(goodIssue)]; f.api.items = [clone(goodItem)];
    change();
    const writes = f.api.writes.length;
    assert.equal((await f.run({ apply: true })).counts.conflicts, 1);
    assert.equal(f.api.writes.length, writes);
  }
});

test('interrupted Project add retains issue identity and recovers without duplicate creation', async (t) => {
  const f = fixture(t), add = f.api.addItem.bind(f.api);
  f.api.addItem = async () => {
    const error = new Error('Simulated explicit HTTP 403 Project permission rejection');
    error.mutationOutcome = 'rejected';
    throw error;
  };
  const failed = await f.run({ apply: true });
  assert.equal(failed.counts.failed, 1);
  assert.equal(f.api.issues.length, 1);
  assert.ok(f.state.workstreams['tracker-foundation'].pending);
  assert.match(readFileSync(f.file(), 'utf8'), /GitHub issue: pending/);
  f.api.addItem = add;
  const recovered = await f.run({ apply: true });
  assert.equal(recovered.counts.verified, 1);
  assert.equal(recovered.counts.created, 0);
  assert.equal(f.api.issues.length, 1); assert.equal(f.api.items.length, 1);
});

test('uncertain successful issue creation is discovered by stable marker on the next run', async (t) => {
  const f = fixture(t), create = f.api.createIssue.bind(f.api);
  f.api.createIssue = async (...args) => { await create(...args); throw new Error('Simulated timeout after creation'); };
  assert.equal((await f.run({ apply: true })).counts.failed, 1);
  assert.equal(f.api.issues.length, 1);
  assert.equal(f.state.workstreams['tracker-foundation'].issueNumber, undefined);
  f.api.createIssue = create;
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  assert.equal(f.api.issues.length, 1);
});

test('uncertain create that is temporarily invisible blocks another create until discovered', async (t) => {
  const f = fixture(t), create = f.api.createIssue.bind(f.api), list = f.api.listIssues.bind(f.api);
  f.api.createIssue = async (...args) => { await create(...args); throw new Error('Simulated uncertain create'); };
  await f.run({ apply: true });
  f.api.createIssue = create;
  f.api.listIssues = async () => [];
  const writes = f.api.writes.length;
  const unresolved = await f.run({ apply: true });
  assert.equal(unresolved.counts.conflicts, 1);
  assert.equal(f.api.writes.length, writes);
  assert.equal(f.api.issues.length, 1);
  f.api.listIssues = list;
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  assert.equal(f.api.issues.length, 1);
});

test('uncertain Project addition that is temporarily invisible blocks a duplicate add', async (t) => {
  const f = fixture(t), add = f.api.addItem.bind(f.api), list = f.api.listItems.bind(f.api);
  f.api.addItem = async (...args) => { await add(...args); throw new Error('Simulated uncertain Project add'); };
  await f.run({ apply: true });
  f.api.addItem = add;
  f.api.listItems = async () => [];
  const writes = f.api.writes.length;
  const unresolved = await f.run({ apply: true });
  assert.equal(unresolved.counts.conflicts, 1);
  assert.equal(f.api.writes.length, writes);
  assert.equal(f.api.items.length, 1);
  f.api.listItems = list;
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  assert.equal(f.api.items.length, 1);
});

test('uncertain successful Project/status writes recover by observed membership/value', async (t) => {
  const f = fixture(t), add = f.api.addItem.bind(f.api), set = f.api.setStatus.bind(f.api);
  f.api.addItem = async (...args) => { await add(...args); throw new Error('Simulated timeout after Project add'); };
  assert.equal((await f.run({ apply: true })).counts.failed, 1);
  f.api.addItem = add;
  f.api.setStatus = async (...args) => { await set(...args); throw new Error('Simulated timeout after Status'); };
  assert.equal((await f.run({ apply: true })).counts.failed, 1);
  f.api.setStatus = set;
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  assert.equal(f.api.items.length, 1); assert.equal(f.api.issues.length, 1);
});

test('partial operation plus another local edit retains older expected targets for safe recovery', async (t) => {
  const f = fixture(t), set = f.api.setStatus.bind(f.api);
  await f.run({ apply: true });
  writeFileSync(f.file(), readFileSync(f.file(), 'utf8').replace('Status: DONE', 'Status: IN_PROGRESS'));
  f.api.setStatus = async () => { throw new Error('Simulated temporary failure'); };
  assert.equal((await f.run({ apply: true })).counts.failed, 1);
  writeFileSync(f.file(), readFileSync(f.file(), 'utf8').replace('Status: IN_PROGRESS', 'Status: IN_REVIEW'));
  f.api.setStatus = set;
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  assert.equal(f.api.items[0].status.optionId, f.config.project.options['In review']);
});

test('a concurrent local edit prevents backlink overwrite and is recoverable on re-preview', async (t) => {
  const f = fixture(t), set = f.api.setStatus.bind(f.api);
  f.api.setStatus = async (...args) => {
    await set(...args);
    writeFileSync(f.file(), readFileSync(f.file(), 'utf8') + '  Concurrent local evidence.\n');
  };
  assert.equal((await f.run({ apply: true })).counts.conflicts, 1);
  assert.match(readFileSync(f.file(), 'utf8'), /Concurrent local evidence/);
  assert.match(readFileSync(f.file(), 'utf8'), /GitHub issue: pending/);
  f.api.setStatus = set;
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  assert.equal(f.api.issues.length, 1);
});

test('stable identity survives a file rename/title change and a lost baseline', async (t) => {
  const f = fixture(t);
  await f.run({ apply: true });
  const previous = f.file();
  f.config.workstreams[0].path = 'TODO/01_RENAMED.todo';
  renameSync(previous, f.file());
  writeFileSync(f.file(), readFileSync(f.file(), 'utf8').replace('Title: Fictional tracker-foundation fixture', 'Title: Renamed fixture'));
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  f.state.workstreams = {};
  assert.equal((await f.run({ apply: true })).counts.verified, 1);
  assert.equal(f.api.issues.length, 1); assert.equal(f.api.items.length, 1);
});

test('repository rename keeps the numeric marker/issue/item and refreshes the verified old backlink', async (t) => {
  const f = fixture(t);
  await f.run({ apply: true });
  f.config.repository = 'Zanark/FictionalRename';
  f.api.issues[0].html_url = 'https://github.com/Zanark/FictionalRename/issues/1';
  const result = await f.run({ apply: true });
  assert.equal(result.counts.verified, 1);
  assert.equal(result.counts.created, 0);
  assert.equal(f.api.issues.length, 1);
  assert.match(readFileSync(f.file(), 'utf8'), /FictionalRename\/issues\/1/);
});

test('duplicates, unmanaged title candidates and conflicting backlinks never create another issue', async (t) => {
  const f = fixture(t);
  f.api.issues.push({ number: 7, title: 'Fictional tracker-foundation fixture', body: 'Human issue', state: 'open' });
  assert.equal((await f.run({ apply: true })).counts.conflicts, 1);
  assert.equal(f.api.writes.length, 0);
  f.api.issues = [];
  await f.run({ apply: true });
  const valid = clone(f.api.issues[0]);
  f.api.issues.push({ ...clone(valid), number: 2, node_id: 'issue-2' });
  assert.equal((await f.run({ apply: true })).counts.conflicts, 1);
  f.api.issues = [valid];
  f.api.items.push({ ...clone(f.api.items[0]), id: 'item-2' });
  assert.equal((await f.run({ apply: true })).counts.conflicts, 1);
  f.api.items.pop();
  writeFileSync(f.file(), readFileSync(f.file(), 'utf8').replace('/issues/1', '/issues/99'));
  assert.equal((await f.run({ apply: true })).counts.conflicts, 1);
  assert.equal(f.api.issues.length, 1);
});

test('private/unreviewed payloads are blocked while an independent safe workstream proceeds', async (t) => {
  const f = fixture(t, ['tracker-foundation', 'appearance-and-identity']);
  f.config.workstreams[0].publicSafe = false;
  const result = await f.run({ apply: true });
  assert.equal(result.counts.conflicts, 1); assert.equal(result.counts.verified, 1);
  assert.equal(f.api.issues.length, 1);
  f.config.workstreams[0].publicSafe = true;
  for (const privateText of ['C:\\private\\records.json', 'GH_TOKEN=ghp_dummy_test_fixture_not_real']) {
    writeFileSync(f.file(), source() + `  ${privateText}\n`);
    const blocked = await f.run({ apply: true, only: ['tracker-foundation'] });
    assert.equal(blocked.counts.conflicts, 1);
    assert.equal(f.api.issues.length, 1);
  }
});

test('unclassified files, wrong recovery identity, missing sources and malformed records do not become empty baselines', async (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.root, 'TODO', '99_UNCLASSIFIED.todo'), source());
  await assert.rejects(() => f.run(), /Unclassified/);
  rmSync(path.join(f.root, 'TODO', '99_UNCLASSIFIED.todo'));
  assert.throws(() => validateConfiguration(f.root, f.config, { ...f.state, repositoryId: 99 }), /another repository/);
  f.state.workstreams['tracker-foundation'] = null;
  assert.throws(() => validateConfiguration(f.root, f.config, f.state), /Invalid recovery/);
  f.state.workstreams = {};
  f.config.workstreams[0].path = 'TODO/MISSING.todo';
  await assert.rejects(() => f.run(), /ENOENT/);
  assert.equal(f.api.writes.length, 0);
});

test('failed remote inventory aborts before any writes instead of implying no issues', async (t) => {
  const f = fixture(t);
  f.api.inventory = async () => { throw new Error('Simulated rate limit'); };
  await assert.rejects(() => f.run({ apply: true }), /rate limit/);
  assert.equal(f.api.writes.length, 0);
});

test('a new human edit between planning and patching is detected at the second read', async (t) => {
  const f = fixture(t);
  await f.run({ apply: true });
  writeFileSync(f.file(), readFileSync(f.file(), 'utf8').replace('Status: DONE', 'Status: IN_PROGRESS'));
  const get = f.api.getIssue.bind(f.api);
  let reads = 0;
  f.api.getIssue = async (number) => {
    if (++reads === 2) f.api.issues[0].title = 'Human edit during apply';
    return get(number);
  };
  const writes = f.api.writes.length;
  assert.equal((await f.run({ apply: true })).counts.conflicts, 1);
  assert.equal(f.api.writes.length, writes);
  assert.equal(f.api.issues[0].title, 'Human edit during apply');
});

test('REST inventory paginates all issues, excludes PRs and propagates second-page failures', async () => {
  const api = new GitHub(original);
  const requests = [];
  api.request = (_method, endpoint) => {
    requests.push(endpoint);
    return endpoint.endsWith('page=1') ? Array.from({ length: 100 }, (_, number) => ({ number }))
      : [{ number: 101 }, { number: 102, pull_request: {} }];
  };
  assert.equal((await api.listIssues()).length, 101);
  assert.equal(requests.length, 2);
  api.request = (_method, endpoint) => {
    if (endpoint.endsWith('page=1')) return Array.from({ length: 100 }, (_, number) => ({ number }));
    throw new Error('Second page unavailable');
  };
  await assert.rejects(() => api.listIssues(), /Second page unavailable/);
});

test('Project inventory follows every cursor and refuses non-advancing pagination', async () => {
  const api = new GitHub(original);
  api.graphql = (_query, variables) => ({
    node: { items: { nodes: [{ id: variables.cursor ? 'second' : 'first' }],
      pageInfo: { hasNextPage: !variables.cursor, endCursor: 'next' } } },
  });
  assert.deepEqual((await api.listItems()).map((item) => item.id), ['first', 'second']);
  api.graphql = () => ({ node: { items: { nodes: [], pageInfo: { hasNextPage: true, endCursor: 'same' } } } });
  await assert.rejects(() => api.listItems(), /did not advance/);
});

test('atomic persistence does not delete a pre-existing temporary file it did not create', (t) => {
  const f = fixture(t);
  const temporary = `${f.file()}.${process.pid}.tmp`;
  writeFileSync(temporary, 'Existing recovery evidence');
  assert.throws(() => atomicWrite(f.file(), 'Replacement'), /EEXIST/);
  assert.equal(readFileSync(temporary, 'utf8'), 'Existing recovery evidence');
  assert.match(readFileSync(f.file(), 'utf8'), /Workstream ID: tracker-foundation/);
});
