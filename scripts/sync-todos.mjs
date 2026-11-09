import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  closeSync, existsSync, lstatSync, openSync, readFileSync, readdirSync,
  renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CONFIG = '.github/todo-sync.json';
const STATE = '.github/todo-sync-state.json';
const BEGIN = '<!-- careeros-todo-managed:start -->';
const END = '<!-- careeros-todo-managed:end -->';
const STAGES = {
  NOT_STARTED: 'Backlog', READY: 'Ready', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In review', DONE: 'Done', CANCELLED: 'Not planned', SUPERSEDED: 'Not planned',
};
const REQUIRED = [
  'Workstream ID', 'Title', 'Status', 'Milestone', 'Dependencies', 'GitHub issue',
  'Purpose', 'Tasks', 'Acceptance criteria', 'Completion evidence', 'Completion log',
];

export const hash = (value) => createHash('sha256').update(value).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const normalized = (text) => text.replace(/\r\n/g, '\n');
const marker = (config, id) => `<!-- careeros-todo:${config.repositoryId}:${id} -->`;

function localPath(root, relative) {
  assert(typeof relative === 'string' && !relative.includes('\\'), 'Configuration paths must be repository-relative slash paths.');
  const resolved = path.resolve(root, relative);
  assert(resolved.startsWith(`${path.resolve(root)}${path.sep}`), `Path escapes repository: ${relative}`);
  return resolved;
}

export function atomicWrite(filename, text) {
  if (existsSync(filename) && readFileSync(filename, 'utf8') === text) return;
  const temporary = `${filename}.${process.pid}.tmp`;
  let descriptor, owned = false;
  try {
    descriptor = openSync(temporary, 'wx');
    owned = true;
    writeFileSync(descriptor, text, { encoding: 'utf8' });
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, filename);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (owned && existsSync(temporary)) unlinkSync(temporary);
  }
}

function jsonFile(filename) {
  try { return JSON.parse(readFileSync(filename, 'utf8')); }
  catch { throw new Error(`Cannot read valid JSON: ${path.basename(filename)}. Do not replace it with an empty baseline.`); }
}

export function emptyState(config) {
  return { schemaVersion: 1, repositoryId: config.repositoryId, projectId: config.project.id, workstreams: {} };
}

export function validateConfiguration(root, config, state) {
  assert(config.schemaVersion === 1 && Number.isSafeInteger(config.repositoryId), 'Unsupported tracking configuration.');
  assert(/^[\w.-]+\/[\w.-]+$/.test(config.repository), 'Invalid canonical repository.');
  assert(config.todoDirectory === 'TODO', 'Only the adopted TODO directory is supported.');
  assert(config.project?.id && config.project?.statusFieldId && config.project?.options, 'Missing discovered Project identifiers.');
  assert(state.schemaVersion === 1 && state.repositoryId === config.repositoryId
    && state.projectId === config.project.id && state.workstreams && !Array.isArray(state.workstreams),
  'Recovery state belongs to another repository/Project or has an invalid schema.');
  const directory = lstatSync(localPath(root, config.todoDirectory));
  assert(directory.isDirectory() && !directory.isSymbolicLink(), 'TODO must be a real repository-local directory.');
  const ids = new Set(), paths = new Set();
  for (const entry of [...config.workstreams, ...config.excluded]) {
    assert(/^TODO\/[^/]+\.todo$/.test(entry.path) && !paths.has(entry.path), 'Duplicate or out-of-scope workstream path.');
    paths.add(entry.path);
    assert(!lstatSync(localPath(root, entry.path)).isSymbolicLink(), 'Tracking sources may not be symbolic links.');
    if ('id' in entry) {
      assert(/^[a-z][a-z0-9-]+$/.test(entry.id) && !ids.has(entry.id), 'Duplicate or invalid stable workstream ID.');
      ids.add(entry.id);
    } else assert(entry.reason?.trim(), 'An exclusion must explain its scope.');
  }
  for (const entry of readdirSync(localPath(root, config.todoDirectory), { withFileTypes: true })) {
    assert(!entry.isDirectory() && !entry.isSymbolicLink(), 'TODO is a flat, explicit .todo inventory; classify new subdirectories before syncing.');
    if (entry.name.endsWith('.todo')) {
      assert(paths.has(`TODO/${entry.name}`), `Unclassified TODO file: ${entry.name}. Add a public-safe entry or an explicit exclusion.`);
    }
  }
  for (const id of Object.keys(state.workstreams)) {
    assert(ids.has(id), `Mapped workstream ${id} is no longer configured; reconcile explicitly, never delete remotely.`);
    const record = state.workstreams[id];
    assert(record && typeof record === 'object' && !Array.isArray(record), `Invalid recovery record for ${id}.`);
    if (record.issueNumber !== undefined) {
      assert(Number.isSafeInteger(record.issueNumber) && record.issueNumber > 0
        && typeof record.issueId === 'string' && typeof record.issueUrl === 'string', `Invalid issue mapping for ${id}.`);
    }
    if (record.baseline) assert(record.issueNumber && typeof record.itemId === 'string', `Incomplete verified mapping for ${id}.`);
    if (record.pending) assert(Array.isArray(record.pending) && record.pending.length > 0 && record.pending.length <= 32, `Invalid/overlong recovery targets for ${id}.`);
    if ('creationPending' in record) assert(record.creationPending === true && record.pending && !record.issueNumber, `Invalid creation intent for ${id}.`);
    if ('itemAdditionPending' in record) assert(record.itemAdditionPending === true && record.pending && record.issueNumber && !record.itemId, `Invalid Project-add intent for ${id}.`);
    for (const signature of [record.baseline, ...(record.pending ?? [])].filter(Boolean)) {
      assert(/^[a-f0-9]{64}$/.test(signature.managed) && typeof signature.title === 'string'
        && ['open', 'closed'].includes(signature.state) && [null, 'completed', 'not_planned'].includes(signature.reason)
        && typeof signature.status === 'string' && signature.archived === false, `Invalid recovery signature for ${id}.`);
    }
  }
}

export function readWorkstream(root, config, entry) {
  assert(entry.publicSafe === true, 'Publication is blocked until this workstream has an explicit public-safe review.');
  const raw = readFileSync(localPath(root, entry.path), 'utf8');
  const text = normalized(raw);
  const fields = {};
  for (const name of REQUIRED.concat(['Blocked stage', 'Blocker'])) {
    const matches = [...text.matchAll(new RegExp(`^${name}:([^\\n]*)`, 'gm'))];
    assert(matches.length === (REQUIRED.includes(name) ? 1 : Math.min(matches.length, 1)), `Missing/duplicate ${name} field.`);
    fields[name] = matches[0]?.[1].trim() ?? '';
  }
  assert(fields['Workstream ID'] === entry.id, 'File and configured stable identity differ; retain the ID through renames.');
  assert(fields.Title && fields.Milestone && fields.Dependencies, 'Title, milestone and dependency declarations must be explicit.');
  const dependencies = fields.Dependencies === 'None' ? [] : fields.Dependencies.split(',').map((id) => id.trim());
  assert(dependencies.every((id) => id !== entry.id && config.workstreams.some((other) => other.id === id)), 'Unknown/self dependency.');
  let stage = STAGES[fields.Status];
  if (fields.Status === 'BLOCKED') {
    stage = fields['Blocked stage'];
    assert(['Backlog', 'Ready', 'In Progress', 'In review'].includes(stage) && fields.Blocker, 'BLOCKED requires an explicit Blocker and Blocked stage.');
  }
  assert(stage && config.project.options[stage], `Unknown exact status or missing Project option: ${fields.Status}`);
  if (fields.Status === 'DONE') assert(!/^\s*\[ \]/m.test(text), 'DONE contains unfinished tasks; reconcile the actual completion boundary.');
  assert(!/(?:gh[pousr]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]+|-----BEGIN .*PRIVATE KEY-----)/.test(text)
    && !/(?:GH_TOKEN|TODO_SYNC_GITHUB_TOKEN)\s*[:=]\s*\S+/i.test(text)
    && !/(?:\b[A-Za-z]:[\\/]|file:\/\/|\.agent-context[\\/])/.test(text),
  'Public payload contains a credential-shaped value or private/local path; review it without publishing.');
  assert(!text.includes(BEGIN) && !text.includes(END) && !text.includes('<!-- careeros-todo:'), 'Source contains reserved tracking markers.');
  const source = text.replace(/^GitHub issue:[^\n]*\n?/m, '').trimEnd();
  const fence = '`'.repeat(Math.max(3, ...[...source.matchAll(/`+/g)].map((match) => match[0].length + 1)));
  const managed = `${BEGIN}\nCanonical workstream: \`${entry.path}\`. Local TODO owns this managed section; notes outside it are preserved.\n\n${fence}text\n${source}\n${fence}\n${END}`;
  assert(Buffer.byteLength(managed, 'utf8') < 60000, 'Issue body exceeds the reviewed size bound.');
  const closed = ['DONE', 'CANCELLED', 'SUPERSEDED'].includes(fields.Status);
  return {
    entry, raw, fields, managed,
    desired: {
      managed: hash(managed), title: fields.Title, state: closed ? 'closed' : 'open',
      reason: closed ? (fields.Status === 'DONE' ? 'completed' : 'not_planned') : null,
      status: config.project.options[stage], archived: false,
    },
    stage,
  };
}

export function managedPart(body, identity) {
  assert(body.includes(identity) && body.split(identity).length === 2, 'Stable issue identity is missing or duplicated.');
  assert(body.split(BEGIN).length === 2 && body.split(END).length === 2, 'Managed body boundaries are missing or duplicated.');
  const start = body.indexOf(BEGIN), end = body.indexOf(END);
  assert(end > start, 'Managed body boundaries are reversed.');
  return body.slice(start, end + END.length);
}

function remoteSignature(issue, item, identity) {
  return {
    managed: hash(managedPart(issue.body ?? '', identity)), title: issue.title,
    state: issue.state, reason: issue.state === 'closed' ? issue.state_reason : null,
    status: item?.status?.optionId ?? null, archived: item?.isArchived ?? false,
  };
}

export function conflict(remote, baseline, pending, desired) {
  for (const key of Object.keys(desired)) {
    const accepted = [desired[key]];
    if (baseline) accepted.push(baseline[key]);
    for (const target of pending ?? []) accepted.push(target[key]);
    if (!baseline && key === 'state') accepted.push('open');
    if (!baseline && ['reason', 'status'].includes(key)) accepted.push(null);
    if (!accepted.includes(remote[key])) return `Unexpected remote ${key}; preserve the human edit and reconcile explicitly.`;
  }
  return null;
}

function findIssue(issues, record, identity, document) {
  const matches = issues.filter((issue) => (issue.body ?? '').includes(identity));
  assert(matches.length <= 1, 'Duplicate stable issue markers; do not create or choose arbitrarily.');
  const issue = matches[0];
  assert(issue || !issues.some((candidate) => candidate.title === document.desired.title),
    'Unmanaged issue with matching title; review/adopt its stable marker explicitly instead of creating a duplicate.');
  assert(issue || !record?.creationPending,
    'Prior issue-create outcome is unresolved and its marker is not visible; stop rather than create again. Reconcile the original operation.');
  if (record?.issueNumber) assert(issue?.number === record.issueNumber && issue.node_id === record.issueId, 'Mapped issue disappeared, changed identity or lost its marker.');
  const backlink = document.fields['GitHub issue'];
  const previousUrl = record?.issueUrl === backlink && record?.issueId === issue?.node_id;
  assert(backlink === 'pending' || (issue && backlink === issue.html_url) || previousUrl,
    'Local backlink differs from the discovered managed issue.');
  return issue;
}

function findItem(items, issue, record) {
  const matches = issue ? items.filter((item) => item.content?.id === issue.node_id) : [];
  assert(matches.length <= 1, 'Duplicate Project items for one issue; reconcile explicitly.');
  assert(matches.length || !record?.itemAdditionPending,
    'Prior Project-add outcome is unresolved and membership is not visible; stop rather than add again. Reconcile the original operation.');
  if (record?.itemId) {
    assert(matches[0]?.id === record.itemId, 'Mapped Project item was removed/replaced; do not silently restore a human removal.');
  }
  return matches[0];
}

function actionsFor(document, issue, item, record, identity) {
  const actions = [];
  if (!issue) return ['create issue', `set issue ${document.desired.state}/${document.desired.reason ?? '-'}`,
    'add issue to Project', `set Project ${document.stage}`, 'write backlink', 'verify all surfaces'];
  const current = remoteSignature(issue, item, identity);
  const problem = conflict(current, record?.baseline, record?.pending, document.desired);
  assert(!problem, problem);
  if (current.managed !== document.desired.managed) actions.push('update managed description');
  if (current.title !== document.desired.title) actions.push('update title');
  if (current.state !== document.desired.state || current.reason !== document.desired.reason) actions.push(`set issue ${document.desired.state}/${document.desired.reason ?? '-'}`);
  if (!item) actions.push('add issue to Project');
  if (current.status !== document.desired.status) actions.push(`set Project ${document.stage}`);
  if (document.fields['GitHub issue'] !== issue.html_url) actions.push('write backlink');
  if (!record?.baseline || record.pending) actions.push('save verified recovery baseline');
  return actions;
}

function ensureUnchanged(root, document) {
  assert(readFileSync(localPath(root, document.entry.path), 'utf8') === document.raw,
    'Local workstream changed during synchronization; partial remote progress is retained. Preview again.');
}

export async function synchronize({ root, config, state, api, apply = false, only = [], saveState = () => {} }) {
  validateConfiguration(root, config, state);
  assert(only.every((id) => config.workstreams.some((entry) => entry.id === id)), 'Unknown --only workstream ID.');
  const inventory = await api.inventory(root, config);
  const report = {
    mode: apply ? 'apply' : 'preview', repository: inventory.repository.full_name,
    project: config.project.url, sourceRevision: inventory.sourceRevision,
    observedAt: new Date().toISOString(), excluded: config.excluded, rows: [],
  };
  for (const entry of config.workstreams.filter((item) => !only.length || only.includes(item.id))) {
    const row = { id: entry.id, path: entry.path, outcome: 'failed', created: false, reused: false };
    report.rows.push(row);
    try {
      const document = readWorkstream(root, config, entry);
      const identity = marker(config, entry.id);
      const record = state.workstreams[entry.id] ?? {};
      let issues = apply ? await api.listIssues() : inventory.issues;
      let items = apply ? await api.listItems() : inventory.items;
      let issue = findIssue(issues, record, identity, document);
      if (issue && apply) issue = await api.getIssue(issue.number);
      let item = findItem(items, issue, record);
      row.reused = Boolean(issue);
      row.issue = issue?.html_url ?? null;
      row.issueState = document.desired.state;
      row.stateReason = document.desired.reason;
      row.projectStatus = document.stage;
      row.managedSha256 = document.desired.managed;
      row.actions = actionsFor(document, issue, item, record, identity);
      if (!apply) { row.outcome = 'planned'; continue; }
      ensureUnchanged(root, document);
      if (row.actions.length) {
        const targets = record.pending ?? [];
        if (!targets.some((target) => same(target, document.desired))) targets.push(document.desired);
        assert(targets.length <= 32, 'Too many partial recovery targets; review the interrupted operations explicitly.');
        record.pending = targets;
        state.workstreams[entry.id] = record;
        saveState(state);
      }
      if (!issue) {
        record.creationPending = true;
        saveState(state);
        try {
          issue = await api.createIssue(document.desired.title, `${identity}\n\n${document.managed}\n\n## Maintainer notes\n`);
        } catch (error) {
          if (error.mutationOutcome === 'rejected') { delete record.creationPending; saveState(state); }
          throw error;
        }
        row.created = true;
      }
      assert((issue.body ?? '').includes(identity), 'Created/discovered issue is missing its stable identity.');
      Object.assign(record, { issueNumber: issue.number, issueId: issue.node_id, issueUrl: issue.html_url });
      delete record.creationPending;
      state.workstreams[entry.id] = record;
      saveState(state);
      row.issue = issue.html_url;
      const current = remoteSignature(issue, item, identity);
      if (current.managed !== document.desired.managed || current.title !== document.desired.title
        || current.state !== document.desired.state || current.reason !== document.desired.reason) {
        ensureUnchanged(root, document);
        const fresh = await api.getIssue(issue.number);
        const problem = conflict(remoteSignature(fresh, item, identity), record.baseline, record.pending, document.desired);
        assert(!problem, problem);
        const body = fresh.body.replace(managedPart(fresh.body, identity), document.managed);
        issue = await api.updateIssue(issue.number, {
          title: document.desired.title, body,
          state: document.desired.state, state_reason: document.desired.reason,
        });
      }
      items = await api.listItems();
      item = findItem(items, issue, record);
      if (!item) {
        ensureUnchanged(root, document);
        record.itemAdditionPending = true;
        saveState(state);
        try {
          item = await api.addItem(issue.node_id);
        } catch (error) {
          if (error.mutationOutcome === 'rejected') { delete record.itemAdditionPending; saveState(state); }
          throw error;
        }
        record.itemId = item.id;
        delete record.itemAdditionPending;
        saveState(state);
      }
      delete record.itemAdditionPending;
      if (item.status?.optionId !== document.desired.status) {
        const problem = conflict(remoteSignature(issue, item, identity), record.baseline, record.pending, document.desired);
        // A newly added item has no Status until this explicit write.
        assert(!problem || (!record.baseline && !item.status && problem.startsWith('Unexpected remote status')), problem);
        ensureUnchanged(root, document);
        await api.setStatus(item.id, document.desired.status);
      }
      let verifiedIssue, verifiedItem;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
        verifiedIssue = await api.getIssue(issue.number);
        verifiedItem = findItem(await api.listItems(), verifiedIssue, record);
        if (verifiedItem && same(remoteSignature(verifiedIssue, verifiedItem, identity), document.desired)) break;
      }
      assert(verifiedItem && same(remoteSignature(verifiedIssue, verifiedItem, identity), document.desired),
        'Read-back differs from the intended issue content/state or Project status; partial progress retained.');
      ensureUnchanged(root, document);
      const filename = localPath(root, entry.path);
      if (document.fields['GitHub issue'] !== verifiedIssue.html_url) {
        atomicWrite(filename, document.raw.replace(/^GitHub issue:[^\r\n]*/m, `GitHub issue: ${verifiedIssue.html_url}`));
      }
      assert(readWorkstream(root, config, entry).fields['GitHub issue'] === verifiedIssue.html_url, 'Persistent backlink read-back failed.');
      Object.assign(record, { itemId: verifiedItem.id, baseline: document.desired });
      delete record.pending;
      saveState(state);
      row.itemId = verifiedItem.id;
      row.outcome = 'verified';
      row.backlink = 'verified';
    } catch (error) {
      row.error = error instanceof Error ? error.message : 'Unknown synchronization failure; not treated as an empty result.';
      row.outcome = /Unexpected remote|Duplicate|Mapped |Unmanaged issue|outcome is unresolved|backlink differs|Publication is blocked|Public payload|changed during|DONE contains/.test(row.error) ? 'conflict' : 'failed';
    }
  }
  report.counts = {
    included: config.workstreams.length, selected: report.rows.length, excluded: config.excluded.length,
    created: report.rows.filter((row) => row.created).length,
    reused: report.rows.filter((row) => row.reused).length,
    verified: report.rows.filter((row) => row.outcome === 'verified').length,
    open: report.rows.filter((row) => row.outcome === 'verified' && row.issueState === 'open').length,
    closed: report.rows.filter((row) => row.outcome === 'verified' && row.issueState === 'closed').length,
    conflicts: report.rows.filter((row) => row.outcome === 'conflict').length,
    failed: report.rows.filter((row) => row.outcome === 'failed').length,
  };
  return report;
}

export class GitHub {
  constructor(config) { this.config = config; }

  request(method, endpoint, payload) {
    const args = ['api', '--hostname', 'github.com', '--method', method, endpoint];
    if (payload !== undefined) args.push('--input', '-');
    const { GH_DEBUG: _debug, ...environment } = process.env;
    try {
      const text = execFileSync('gh', args, {
        input: payload === undefined ? undefined : JSON.stringify(payload),
        encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024,
        env: { ...environment, GH_PROMPT_DISABLED: '1' }, stdio: ['pipe', 'pipe', 'pipe'],
      });
      const result = JSON.parse(text);
      assert(!result.errors?.length, 'GitHub GraphQL reported errors; no response is treated as an empty baseline.');
      return result;
    } catch (error) {
      const detail = String(error.stderr ?? '');
      const reason = /rate limit|HTTP 429/i.test(detail) ? 'rate limited'
        : /HTTP 40[134]/.test(detail) ? 'access, identity or resource refused'
          : error.code === 'ETIMEDOUT' ? 'timed out; mutation outcome may be uncertain'
            : 'request or response failed';
      const failure = new Error(`GitHub ${method} ${endpoint}: ${reason}. Successful earlier steps are retained; reconcile with preview before retrying.`);
      failure.mutationOutcome = /HTTP (400|401|403|404|405|409|410|415|422|429)\b/.test(detail) ? 'rejected' : 'uncertain';
      throw failure;
    }
  }

  graphql(query, variables = {}) { return this.request('POST', 'graphql', { query, variables }).data; }
  async listIssues() {
    const all = [];
    for (let page = 1; ; page++) {
      const batch = this.request('GET', `repos/${this.config.repository}/issues?state=all&per_page=100&page=${page}`);
      assert(Array.isArray(batch), 'Unexpected issue inventory shape.');
      all.push(...batch.filter((item) => !item.pull_request));
      if (batch.length < 100) return all;
    }
  }

  async listItems() {
    const all = [];
    let cursor = null;
    do {
      const result = this.graphql(`query($id:ID!,$cursor:String) { node(id:$id) { ... on ProjectV2 {
        items(first:100,after:$cursor) { nodes { id isArchived
          content { ... on Issue { id number } }
          status:fieldValueByName(name:"Status") { ... on ProjectV2ItemFieldSingleSelectValue { optionId name } }
        } pageInfo { hasNextPage endCursor } }
      } } }`, { id: this.config.project.id, cursor }).node?.items;
      assert(result?.nodes && result.pageInfo, 'Project item inventory unavailable.');
      all.push(...result.nodes);
      const next = result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null;
      assert(!next || next !== cursor, 'Project pagination did not advance.');
      cursor = next;
    } while (cursor);
    return all;
  }

  async inventory(root, config) {
    const viewer = this.request('GET', 'user');
    assert(viewer.login === config.account, 'Credential account differs from the explicitly adopted account; do not silently switch.');
    const repository = this.request('GET', `repos/${config.repository}`);
    assert(repository.id === config.repositoryId && repository.node_id === config.repositoryNodeId
      && repository.visibility === 'public' && repository.has_issues
      && (repository.permissions?.push || repository.permissions?.triage),
    'Repository identity/visibility/issue-write permission changed; stop for review.');
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
    const slug = /^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(remote)?.[1];
    assert(slug, 'Origin is not an unambiguous github.com repository.');
    const remoteRepository = slug === config.repository ? repository : this.request('GET', `repos/${slug}`);
    assert(remoteRepository.id === config.repositoryId, 'Origin points at a different repository.');
    const project = this.graphql(`query($id:ID!) { node(id:$id) { ... on ProjectV2 {
      id number url closed viewerCanUpdate owner { ... on User { login } ... on Organization { login } }
      repositories(first:100) { nodes { id } pageInfo { hasNextPage } }
      fields(first:100) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } pageInfo { hasNextPage } }
    } } }`, { id: config.project.id }).node;
    assert(project?.viewerCanUpdate && !project.closed && project.number === config.project.number
      && project.owner.login === config.project.owner && project.url === config.project.url,
    'Configured Project identity/edit access changed.');
    assert(!project.repositories.pageInfo.hasNextPage && !project.fields.pageInfo.hasNextPage,
      'Project repository/field inventory exceeds the supported 100 entries; stop rather than assume complete coverage.');
    assert(project.repositories.nodes.some((repo) => repo.id === repository.node_id), 'Project is not associated with this repository.');
    const field = project.fields.nodes.find((item) => item.id === config.project.statusFieldId);
    assert(field?.name === 'Status' && Object.entries(config.project.options).every(([name, id]) => field.options.some((option) => option.id === id && option.name === name)),
      'Configured Project Status field/options changed; preserve configuration and reconcile.');
    return {
      repository, issues: await this.listIssues(), items: await this.listItems(),
      sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    };
  }

  async getIssue(number) { return this.request('GET', `repos/${this.config.repository}/issues/${number}`); }
  async createIssue(title, body) { return this.request('POST', `repos/${this.config.repository}/issues`, { title, body }); }
  async updateIssue(number, values) { return this.request('PATCH', `repos/${this.config.repository}/issues/${number}`, values); }
  async addItem(issueId) {
    return this.graphql(`mutation($project:ID!,$issue:ID!) {
      addProjectV2ItemById(input:{projectId:$project,contentId:$issue}) { item { id isArchived } }
    }`, { project: this.config.project.id, issue: issueId }).addProjectV2ItemById.item;
  }
  async setStatus(itemId, optionId) {
    this.graphql(`mutation($project:ID!,$item:ID!,$field:ID!,$option:String!) {
      updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$option}}) { clientMutationId }
    }`, { project: this.config.project.id, item: itemId, field: this.config.project.statusFieldId, option: optionId });
  }
}

function argumentsFor(args) {
  const options = { apply: false, only: [], report: null };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--apply') options.apply = true;
    else if (args[index] === '--preview') continue;
    else if (args[index] === '--only') {
      assert(args[index + 1] && !args[index + 1].startsWith('--'), '--only needs a stable workstream ID.');
      options.only.push(args[++index]);
    } else if (args[index] === '--report') {
      options.report = args[++index]?.replaceAll('\\', '/');
      assert(/^docs\/tracking\/[a-zA-Z0-9._-]+\.json$/.test(options.report ?? ''), '--report must name a JSON file under docs/tracking.');
    } else throw new Error(`Unknown argument: ${args[index]}`);
  }
  return options;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('node scripts\\sync-todos.mjs [--preview | --apply] [--only stable-id] [--report docs/tracking/name.json]\nDefault is read-only preview. Run through the documented credential runner. No background automation.');
    return;
  }
  const options = argumentsFor(process.argv.slice(2));
  const config = jsonFile(path.join(ROOT, CONFIG));
  const lock = path.join(ROOT, '.github/todo-sync.lock');
  let descriptor;
  try {
    if (options.apply) {
      try { descriptor = openSync(lock, 'wx'); }
      catch { throw new Error('Another local sync may own todo-sync.lock. Inspect its PID/unfinished receipt before removing a stale lock; do not run competing writers.'); }
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    }
    const filename = path.join(ROOT, STATE);
    const state = existsSync(filename) ? jsonFile(filename) : emptyState(config);
    const report = await synchronize({
      root: ROOT, config, state, api: new GitHub(config), ...options,
      saveState: (value) => atomicWrite(filename, `${JSON.stringify(value, null, 2)}\n`),
    });
    if (options.report) atomicWrite(localPath(ROOT, options.report), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    if (report.counts.failed || report.counts.conflicts) process.exitCode = 1;
  } finally {
    if (descriptor !== undefined) { closeSync(descriptor); unlinkSync(lock); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
