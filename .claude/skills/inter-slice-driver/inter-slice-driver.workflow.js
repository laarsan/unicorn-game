export const meta = {
  name: 'inter-slice-driver',
  description: 'Build out all ready-for-agent slices for the current R-BUILD step, fresh context per slice (Workflow-orchestrated, greenfield only — ADR 0020, ADR 0025)',
  phases: [
    { title: 'Discovery', detail: 'check greenfield posture; identify open ready-for-agent slices for current build step' },
    { title: 'Build', detail: 'parallel-coder implements test-first in an isolated worktree (ADR 0025 §2)' },
    { title: 'Verify', detail: 'test-runner independently re-runs the suite against the worktree — the binding mechanical gate' },
    { title: 'Review', detail: 'reviewer-agent per slice; up to 3 fix rounds if blocking (ADR 0019 §2)' },
    { title: 'Merge', detail: 'serialized merge worktree→main, push, close issue with the spawn-kvitto (ADR 0024 §3)' },
  ],
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const DISCOVERY_SCHEMA = {
  type: 'object',
  required: ['posture', 'stepName', 'openSlices'],
  properties: {
    posture: {
      type: 'string',
      description: 'Value of autonomyPosture from .claude/settings.json; "greenfield" if key absent or file missing'
    },
    stepName: {
      type: 'string',
      description: 'Current build step name from docs/plan-to-done.md ▶ NÄSTA pointer'
    },
    openSlices: {
      type: 'array',
      description: 'Open GitHub issues labelled ready-for-agent that belong to the current build step, sorted by issue number ascending',
      items: {
        type: 'object',
        required: ['number', 'title'],
        properties: {
          number: { type: 'number' },
          title: { type: 'string' }
        }
      }
    }
  }
}

// Mirrors parallel-coder.md's krympta kontrakt (ADR 0025 §2 / H4a) plus one
// addition: the worktree path, needed to route the independent test-runner
// and reviewer stages at the caller (parallel-coder itself never pushes,
// comments, or closes — the caller owns integration).
const PARALLEL_CODER_SCHEMA = {
  type: 'object',
  required: ['status', 'tests_passed', 'worktree_path'],
  properties: {
    status: { type: 'string', enum: ['done', 'blocked'] },
    files_modified: { type: 'array', items: { type: 'string' } },
    tests_passed: { type: 'boolean', description: 'Advisory self-graded signal — the caller does not treat this as a gate (ADR 0025 §2)' },
    blocker: {},
    worktree_path: { type: 'string', description: 'Absolute path to this agent\'s isolated git worktree (git rev-parse --show-toplevel)' }
  }
}

// Mirrors test-runner.md's output contract exactly — the stakeless,
// mechanical, context-isolated ground truth (ADR 0025 §5).
const TEST_RUNNER_SCHEMA = {
  type: 'object',
  required: ['passed', 'total', 'failed_count', 'failed_tests'],
  properties: {
    passed: { type: 'boolean' },
    total: { type: 'number' },
    failed_count: { type: 'number' },
    failed_tests: { type: 'array', items: { type: 'string' } }
  }
}

const REVIEW_SCHEMA = {
  type: 'object',
  required: ['sliceNumber', 'blocking', 'nits'],
  properties: {
    sliceNumber: { type: 'number' },
    blocking: {
      type: 'array',
      description: 'Blocking findings that must be fixed before the slice is done (each as a short sentence)',
      items: { type: 'string' }
    },
    nits: {
      type: 'array',
      description: 'Non-blocking findings (style, naming); logged but never stop the slice',
      items: { type: 'string' }
    }
  }
}

const FIX_SCHEMA = {
  type: 'object',
  required: ['sliceNumber', 'outcome', 'summary'],
  properties: {
    sliceNumber: { type: 'number' },
    outcome: { type: 'string', enum: ['fixed', 'failed'] },
    summary: { type: 'string', description: 'What was fixed and recommitted' }
  }
}

const SECURITY_SCHEMA = {
  type: 'object',
  required: ['vulnerabilities'],
  properties: {
    vulnerabilities: {
      type: 'array',
      description: 'Findings per .claude/agents/security-reviewer.md output format',
      items: {
        type: 'object',
        required: ['severity', 'issue'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          file: {},
          line: {},
          issue: { type: 'string' },
          cwe: {},
          evidence: { type: 'string' },
          citation: {}
        }
      }
    }
  }
}

// Security-surface keywords mirroring ADR 0015 §3 / plan-next R-BUILD's
// villkor for spawning security-reviewer.md: auth, external calls, file I/O
// with outside input, database access, serialisation, untrusted input.
const SECURITY_SURFACE_PATTERN = /auth|\bhttps?\b|\bexternal\b|\bapi\b|file i\/o|database|serialis|untrusted input/i

// Merge-agent's structured verdict — Stage D must not report a slice "done"
// on an unchecked agent() return (ADR 0025 §3: malformed/missing return =
// failure, not benign fill-in — applies to the terminal step too).
const MERGE_SCHEMA = {
  type: 'object',
  required: ['outcome'],
  properties: {
    outcome: { type: 'string', enum: ['merged', 'failed'] },
    reason: { description: 'Required when outcome is "failed" — which step failed and why' }
  }
}

// ── Merge mutex (ADR 0025 §2 — the only serialized step) ────────────────────
//
// build/test-runner/review run fully in parallel across slices (pipeline() —
// no barrier). Merge+push is the one mutex-like step: worktrees avoid the
// write conflict during build, but main itself can only accept one merge at
// a time. Chain every merge onto the same promise so they execute in order,
// regardless of which slice's review finished first.
//
// A throwing fn is caught and turned into an escalated result — same
// discipline as every other stage — rather than propagating a rejection
// that would bypass the pipeline's escalation handling.

let mergeLock = Promise.resolve()

function withMergeLock(slice, fn) {
  const run = mergeLock.then(fn, fn).catch((err) => ({
    slice, status: 'escalated', reason: 'merge-stage-threw', blocking: [String(err && err.message ? err.message : err)]
  }))
  mergeLock = run.then(() => {})
  return run
}

// ── Phase 1: Discovery ───────────────────────────────────────────────────────

phase('Discovery')

const discovery = await agent(
  `You are the discovery agent for the inter-slice-drivaren (ADR 0020).

Step 1 — Read .claude/settings.json. Extract the "autonomyPosture" field.
         If the field is absent or the file does not exist, return "greenfield".

Step 2 — Read docs/plan-to-done.md. Find the ▶ NÄSTA block and extract
         the current build step name (e.g. "G1 Inter-slice-drivare (R-BUILD)").

Step 3 — Run: gh issue list --state open --label ready-for-agent --limit 100 --json number,title,labels
         Filter to only issues whose title contains the current build step identifier
         (match the short step prefix such as "G1", "B1", "F7", etc. from the step name).
         Sort by issue number ascending.

Return all three fields as structured data.`,
  { label: 'discovery', phase: 'Discovery', schema: DISCOVERY_SCHEMA }
)

if (!discovery) {
  log('Discovery misslyckades — avbryter.')
  return { aborted: true, reason: 'discovery-failed' }
}

if (discovery.posture !== 'greenfield') {
  log('Autonomi-posture är "' + discovery.posture + '" — inter-slice-drivaren kräver greenfield. Kör plan-next för en-slice-per-anrop i hardened.')
  return { aborted: true, reason: 'posture-not-greenfield', posture: discovery.posture }
}

if (!discovery.openSlices || discovery.openSlices.length === 0) {
  log('Inga öppna ready-for-agent-slices för steg "' + discovery.stepName + '". Inget att bygga.')
  return { aborted: true, reason: 'no-open-slices', stepName: discovery.stepName }
}

log('Posture: greenfield. Steg: "' + discovery.stepName + '". Öppna slices: ' + discovery.openSlices.length + ' (#' + discovery.openSlices.map((s) => s.number).join(', #') + ')')

const stepName = discovery.stepName

// ── Phase 2–5: Build → Verify → Review → Merge, per slice ────────────────────
//
// Producent–verifierare-separationen (ADR 0025 §2, väg a):
// Stage A — parallel-coder (isolation: worktree), krympt kontrakt: implementerar
//           test-first, self-rapporterar tests_passed, committar i worktreen,
//           pushar/kommenterar/stänger aldrig.
// Stage B — test-runner-grind: kör Pester oberoende mot worktreen. Rött →
//           eskalera. Ingen merge. Reviewern spawnas aldrig.
// Stage C — reviewer (+ villkorlig security-reviewer) granskar worktree-diffen.
//           Reviewern kör inte längre Pester — test-runner är den maskinella
//           grinden. Blocking → fix-loop i worktreen, max 3 varv (ADR 0019 §2).
// Stage D — git-bokföring sist: merge worktree→main + push, serialiserat
//           (mergeLock), close-comment bär test-runner- + reviewer-verdikt
//           (spawn-kvittot, ADR 0024).
//
// pipeline() ger varje slice alla fyra stegen utan barriär — slice #2 kan vara
// i Build medan slice #1 redan är i Review.
//
// Merge-beslutslogiken i Stage B–D (nedan) är kodifierad som kanonisk spec i
// docs/agents/anti-skip-decision-table.json (ADR 0027 §2, §3) — en
// Pester-drift-guard (tests/H6-anti-skip-eval.Tests.ps1) verifierar att
// eskaleringsskälen och severity-tröskeln nedan matchar tabellen. Tabellen är
// spec, inte en runtime-tolk — den här filen förblir imperativ.

const sliceResults = await pipeline(
  discovery.openSlices,

  // ── Stage A: Build (parallel-coder, worktree) ────────────────────────────
  (slice) => agent(
    'Implement slice #' + slice.number + ' — "' + slice.title + '" of R-BUILD step "' + stepName + '".\n\n' +
    '## Task\n' +
    '1. Read GitHub issue #' + slice.number + ' for full requirements: gh issue view ' + slice.number + '\n\n' +
    '2. Read CLAUDE.md and .claude/settings.json for project conventions.\n\n' +
    '3. Implement **test-first**: write a failing Pester test that captures the\n' +
    '   requirement, then implement code until the test passes.\n\n' +
    '4. Run the full Pester test suite: Invoke-Pester tests/ -Output Detailed\n' +
    '   It should be green before you commit — but your tests_passed claim is advisory only;\n' +
    '   a stakeless test-runner agent re-verifies it independently before anything merges.\n\n' +
    '5. Commit with a conventional-prefix message (feat:/fix:/docs:/test:),\n' +
    '   **no AI attribution**, in English — **in your own worktree only**.\n' +
    '   Do NOT push, comment on the issue, or close it. The caller owns integration.\n\n' +
    '6. Report your worktree\'s absolute path as worktree_path: git rev-parse --show-toplevel\n\n' +
    '## Invariants\n' +
    '- One slice only — do not touch other slices.\n' +
    '- Test-first is mandatory — no manual-only testing.\n' +
    '- No "Co-Authored-By: Claude" or AI attribution in commits.\n' +
    '- PowerShell 7 primary; Python for data transformation; UTF-8 without BOM.',
    { agentType: 'parallel-coder', isolation: 'worktree', label: 'build:#' + slice.number, phase: 'Build', schema: PARALLEL_CODER_SCHEMA }
  ),

  // ── Stage B: Verify (test-runner-grind — the binding mechanical gate) ────
  async (buildResult, slice) => {
    if (!buildResult || buildResult.status === 'blocked') {
      log('Slice #' + slice.number + ': build blockerad/misslyckad — eskaleras utan test-runner/review.')
      return {
        slice, status: 'escalated', reason: 'build-blocked',
        blocking: buildResult && buildResult.blocker ? [String(buildResult.blocker)] : ['parallel-coder returnerade ingen giltig retur']
      }
    }

    log('Slice #' + slice.number + ': test-runner-grind mot worktree ' + buildResult.worktree_path)

    const testRunnerResult = await agent(
      'Verify the Pester suite for slice #' + slice.number + ' of R-BUILD step "' + stepName + '".\n\n' +
      'Worktree path to verify: ' + buildResult.worktree_path + '\n\n' +
      'Run the suite against this exact path and report the result. Do not trust the build agent\'s ' +
      'self-reported tests_passed claim (tests_passed: ' + buildResult.tests_passed + ') — re-run independently.',
      { agentType: 'test-runner', label: 'test-runner:#' + slice.number, phase: 'Verify', schema: TEST_RUNNER_SCHEMA }
    )

    if (!testRunnerResult || testRunnerResult.passed !== true) {
      log('Slice #' + slice.number + ': test-runner rapporterar rött — eskaleras. Reviewern spawnas aldrig.')
      return {
        slice, status: 'escalated', reason: 'test-runner-red',
        blocking: testRunnerResult && testRunnerResult.failed_tests && testRunnerResult.failed_tests.length > 0
          ? testRunnerResult.failed_tests
          : ['test-runner misslyckades att köra eller returnerade ogiltig retur']
      }
    }

    return {
      slice, status: 'tests-green',
      worktreePath: buildResult.worktree_path,
      filesModified: buildResult.files_modified || [],
      testRunner: testRunnerResult
    }
  },

  // ── Stage C: Review (+ conditional security-reviewer) + fix loop ────────
  async (verifyResult, slice) => {
    if (!verifyResult || verifyResult.status === 'escalated') {
      return verifyResult || { slice, status: 'escalated', reason: 'verify-stage-failed', blocking: [] }
    }

    const worktreePath = verifyResult.worktreePath
    let round = 0
    let reviewResult = null

    while (round < 3) {
      round++
      log('Slice #' + slice.number + ': review-varv ' + round + '/3')

      reviewResult = await agent(
        'You are the reviewer-agent (ADR 0008, ADR 0015) for slice #' + slice.number + ' of R-BUILD step "' + stepName + '".\n\n' +
        '**Round:** ' + round + '/3 (max 3 — ADR 0019 §2)\n' +
        '**Worktree to review:** ' + worktreePath + '\n\n' +
        '## Your task\n' +
        '1. Read .claude/agents/reviewer.md for review criteria.\n' +
        '2. Inspect the worktree diff: git -C "' + worktreePath + '" diff main...HEAD\n' +
        '3. Review for: logic errors, security issues (OWASP top 10), naming problems,\n' +
        '   dead code, test coverage gaps, convention violations (CLAUDE.md).\n' +
        '   Do NOT run the test suite yourself — a stakeless test-runner agent already\n' +
        '   verified it green independently (ADR 0025 §2); re-running it here is redundant.\n' +
        '4. Categorise each finding: "blocking" (must fix) or "nit" (logged, does not block).\n' +
        '5. Return findings. If no blocking findings, the slice is done.\n\n' +
        '## Important\n' +
        '- Do NOT make code changes — only review and return findings.\n' +
        '- nit findings are logged but never block or consume a round.',
        { label: 'review:#' + slice.number + '/r' + round, phase: 'Review', schema: REVIEW_SCHEMA }
      )

      if (!reviewResult) {
        log('Slice #' + slice.number + ': reviewer misslyckades på varv ' + round + ' — eskaleras.')
        return { slice, status: 'escalated', reason: 'reviewer-failed', round, blocking: [] }
      }

      if (!reviewResult.blocking || reviewResult.blocking.length === 0) {
        const nits = reviewResult.nits || []
        const securitySurface = SECURITY_SURFACE_PATTERN.test((verifyResult.filesModified || []).join(' ') + ' ' + slice.title)
        let securityVulns = []

        if (securitySurface) {
          log('Slice #' + slice.number + ': säkerhetsyta detekterad — spawnar security-reviewer.')

          const securityResult = await agent(
            'You are the security-reviewer-agent for slice #' + slice.number + ' of R-BUILD step "' + stepName + '".\n\n' +
            '**Worktree to review:** ' + worktreePath + '\n\n' +
            '## Your task\n' +
            '1. Read .claude/agents/security-reviewer.md for review criteria and output format.\n' +
            '2. Inspect the worktree diff: git -C "' + worktreePath + '" diff main...HEAD\n' +
            '3. Look for injection attacks, authentication/authorization flaws, secrets in code,\n' +
            '   unsafe deserialization, broken access control, cryptographic weaknesses, OWASP Top 10 patterns.\n' +
            '4. Return findings exactly per security-reviewer.md\'s JSON output format (vulnerabilities array).',
            { label: 'security:#' + slice.number, phase: 'Review', schema: SECURITY_SCHEMA }
          )

          if (!securityResult) {
            log('Slice #' + slice.number + ': security-reviewer misslyckades — eskaleras.')
            return { slice, status: 'escalated', reason: 'security-reviewer-failed', blocking: [] }
          }

          securityVulns = securityResult.vulnerabilities || []
          const securityBlocking = securityVulns.filter((v) => v.severity === 'critical' || v.severity === 'high')

          if (securityBlocking.length > 0) {
            log('Slice #' + slice.number + ': security-reviewer fann ' + securityBlocking.length + ' blockande sårbarheter — eskaleras.')
            return { slice, status: 'escalated', reason: 'security-blocking', blocking: securityBlocking.map((v) => v.issue) }
          }
        }

        return {
          slice, status: 'ready-to-merge', worktreePath, rounds: round, nits,
          testRunner: verifyResult.testRunner, securityReviewed: securitySurface, securityFindings: securityVulns.length
        }
      }

      if (round === 3) {
        log('Slice #' + slice.number + ': blockande fynd kvarstår efter 3 varv — eskaleras.')
        return { slice, status: 'escalated', reason: 'max-rounds-reached', blocking: reviewResult.blocking }
      }

      log('Slice #' + slice.number + ': fixar ' + reviewResult.blocking.length + ' blockande fynd (varv ' + round + ')')

      await agent(
        'You are a fix-agent for slice #' + slice.number + ' of R-BUILD step "' + stepName + '".\n\n' +
        '**Fix round:** ' + round + '/3\n' +
        '**Worktree:** ' + worktreePath + '\n' +
        '**Blocking findings to address:**\n' +
        reviewResult.blocking.map((b, i) => (i + 1) + '. ' + b).join('\n') + '\n\n' +
        '## Your task\n' +
        '1. Read the current state of files changed in this slice, inside the worktree above.\n' +
        '2. Fix ONLY the listed blocking findings — no refactoring or feature additions.\n' +
        '3. Run the full Pester test suite against the worktree: Invoke-Pester "' + worktreePath + '/tests" -Output Minimal\n' +
        '   Suite must be green after your fix.\n' +
        '4. Commit the fix **in the worktree** (no AI attribution, English):\n' +
        '   git -C "' + worktreePath + '" commit -am "fix: address review findings for #' + slice.number + ' (round ' + round + ')"\n' +
        '   Do NOT push — the worktree is not pushed until git-bokföring merges it.',
        { label: 'fix:#' + slice.number + '/r' + round, phase: 'Review', schema: FIX_SCHEMA }
      )
    }

    return { slice, status: 'escalated', reason: 'review-loop-exhausted', blocking: reviewResult ? (reviewResult.blocking || []) : [] }
  },

  // ── Stage D: Git-bokföring (serialized merge worktree→main, push, close) ─
  (reviewResult, slice) => {
    if (!reviewResult || reviewResult.status !== 'ready-to-merge') {
      return reviewResult || { slice, status: 'escalated', reason: 'review-stage-failed', blocking: [] }
    }

    return withMergeLock(slice, async () => {
      const nits = reviewResult.nits || []
      const testRunner = reviewResult.testRunner || {}
      let closeComment = 'Test-runner verdict: ' + (testRunner.total || 0) + ' tests, ' + (testRunner.failed_count || 0) + ' failed.' +
        ' Reviewer verdict: 0 blocking, ' + nits.length + ' nits.'

      if (reviewResult.securityReviewed) {
        closeComment += ' Security-reviewer verdict: 0 blocking vulnerabilities, ' + reviewResult.securityFindings + ' findings.'
      }

      log('Slice #' + slice.number + ': git-bokföring — merge worktree→main (serialiserat).')

      // The merge commit message intentionally omits slice.title: it is
      // free-text from an issue and would otherwise be interpolated into a
      // double-quoted shell argument the merge agent runs via Bash. The
      // issue number is sufficient to trace back to the full title via
      // `gh issue view`.
      const mergeResult = await agent(
        'Finalize slice #' + slice.number + ' — merge its worktree into main and close the issue.\n\n' +
        '## Task\n' +
        '1. Get the worktree\'s HEAD commit: git -C "' + reviewResult.worktreePath + '" rev-parse HEAD\n' +
        '2. From the main repo root (on the main branch), merge that commit: git merge --no-ff <SHA> -m "merge: slice #' + slice.number + '"\n' +
        '   If the merge conflicts, run git merge --abort and report outcome "failed" with the reason.\n' +
        '3. Push: git push\n' +
        '   If the push is rejected (e.g. non-fast-forward), report outcome "failed" with the reason.\n' +
        '4. Close the issue: gh issue close ' + slice.number + ' --comment "' + closeComment + '"\n' +
        '   If this fails, report outcome "failed" with the reason.\n' +
        '5. Remove the worktree: git worktree remove "' + reviewResult.worktreePath + '" --force\n\n' +
        'Report outcome "merged" only if steps 1–4 all succeeded.\n\n' +
        '## Invariants\n' +
        '- No AI attribution in the merge commit.\n' +
        '- This is the only serialized step in the pipeline — do not defer or reorder these five steps.',
        { label: 'merge:#' + slice.number, phase: 'Merge', schema: MERGE_SCHEMA }
      )

      if (!mergeResult || mergeResult.outcome !== 'merged') {
        log('Slice #' + slice.number + ': git-bokföring misslyckades — eskaleras.')
        return {
          slice, status: 'escalated', reason: 'merge-failed',
          blocking: mergeResult && mergeResult.reason ? [String(mergeResult.reason)] : ['merge-agenten misslyckades eller returnerade ogiltig retur']
        }
      }

      return {
        slice, status: 'done', rounds: reviewResult.rounds, nits,
        securityReviewed: reviewResult.securityReviewed, securityFindings: reviewResult.securityFindings,
        testRunner
      }
    })
  }
)

// ── Summary ──────────────────────────────────────────────────────────────────

const done = sliceResults.filter(Boolean).filter((r) => r.status === 'done')
const escalated = sliceResults.filter(Boolean).filter((r) => r.status === 'escalated')

log('Inter-slice-drivaren klar för steg "' + stepName + '". Done: ' + done.length + ', Eskalerade: ' + escalated.length + '.')

if (escalated.length > 0) {
  log('Eskalerade slices kräver mänsklig granskning: #' + escalated.map((r) => r.slice.number).join(', #'))
}

return {
  stepName,
  done: done.map((r) => ({ number: r.slice.number, title: r.slice.title, rounds: r.rounds })),
  escalated: escalated.map((r) => ({ number: r.slice.number, title: r.slice.title, reason: r.reason, blocking: r.blocking }))
}
