#Requires -Version 7
<#
.SYNOPSIS
    E3 — Generates docs/status/index.html from durable project truth sources.
.PARAMETER RepoRoot
    Project root. Default = parent of $PSScriptRoot (setup/ → project root).
.PARAMETER IssueStateJson
    Path to JSON file with issue state (gh issue list --json output). Skips gh call.
.PARAMETER TestPassedOverride
    Passed test count override. Use -1 (default) to auto-detect via Pester.
.PARAMETER TestTotalOverride
    Total test count override. Use -1 (default) to auto-detect via Pester.
#>
[CmdletBinding()]
param(
    [string]$RepoRoot        = '',
    [string]$IssueStateJson  = '',
    [int]$TestPassedOverride = -1,
    [int]$TestTotalOverride  = -1
)

$utf8NoBom = [Text.UTF8Encoding]::new($false)

# ─── Truth-gather ─────────────────────────────────────────────────────────────

function Get-NastaPointer([string]$root) {
    $path = Join-Path $root 'docs\plan-to-done.md'
    if (-not (Test-Path $path)) { return 'Okänd' }
    $content = [System.IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
    if ($content -match '##\s+▶\s+NÄSTA:\s+(.+)') { return $Matches[1].Trim() }
    return 'Okänd'
}

function Get-PlanSteps([string]$root) {
    $path  = Join-Path $root 'docs\plan-to-done.md'
    $steps = [System.Collections.Generic.List[hashtable]]::new()
    if (-not (Test-Path $path)) { return $steps }
    foreach ($line in [System.IO.File]::ReadAllLines($path, [Text.Encoding]::UTF8)) {
        # Match numbered steps: "- **N. Word" — captures any numbered step
        if ($line -match '^\s*-\s+\*\*(\d+)\.\s+([A-Za-z]\w*)') {
            $steps.Add(@{ Number = [int]$Matches[1]; TrackId = $Matches[2] })
        }
    }
    return $steps
}

function Get-GapStatusMap([string]$root) {
    $path = Join-Path $root 'docs\gap-analysis-plan.md'
    $map  = @{}
    if (-not (Test-Path $path)) { return $map }
    $inStatusTable = $false
    foreach ($line in [System.IO.File]::ReadAllLines($path, [Text.Encoding]::UTF8)) {
        if ($line -match 'Statusöversikt') { $inStatusTable = $true; continue }
        if (-not $inStatusTable) { continue }
        # Table rows start with "| TrackId ..."
        if ($line -match '^\|\s*([A-Z]\d+)\s') {
            $cols    = $line -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_.Length -gt 0 }
            if ($cols.Count -ge 2) {
                $trackId = ($cols[0] -split '\s+')[0]
                $status  = ($cols[1] -split '\s+')[0].ToLower()
                $map[$trackId] = $status
            }
        }
    }
    return $map
}

function Get-IssueData([string]$root, [string]$injectedJson) {
    $json = ''
    if ($injectedJson -and (Test-Path $injectedJson)) {
        $json = [System.IO.File]::ReadAllText($injectedJson, [Text.Encoding]::UTF8)
    } else {
        try { $json = & gh issue list --state all --limit 200 --json number,title,state,labels 2>$null } catch {}
    }
    if (-not $json) { return @() }
    try { $issues = $json | ConvertFrom-Json } catch { return @() }

    $result = [System.Collections.Generic.List[hashtable]]::new()
    foreach ($issue in $issues) {
        $trackId = ''
        if ($issue.title -match '^([A-Z]\d+)[a-z]?\s*[—–]') { $trackId = $Matches[1] }
        $isBug = $false
        if ($issue.labels) {
            foreach ($lbl in $issue.labels) { if ($lbl.name -match 'bug') { $isBug = $true } }
        }
        $isBlocked = $false
        if ($issue.labels) {
            foreach ($lbl in $issue.labels) { if ($lbl.name -match 'blocked') { $isBlocked = $true } }
        }
        $result.Add(@{
            Number    = $issue.number
            Title     = $issue.title
            State     = $issue.state
            TrackId   = $trackId
            IsBug     = $isBug
            IsBlocked = $isBlocked
        })
    }
    return $result.ToArray()
}

function Get-TestCounts([string]$root, [int]$passedOverride, [int]$totalOverride) {
    if ($passedOverride -ge 0 -and $totalOverride -ge 0) {
        return @{ Passed = $passedOverride; Total = $totalOverride }
    }
    $testsDir = Join-Path $root 'tests'
    if (-not (Test-Path $testsDir)) { return @{ Passed = -1; Total = -1 } }
    try {
        if (Get-Command New-PesterConfiguration -ErrorAction SilentlyContinue) {
            # Pester 5
            $cfg = New-PesterConfiguration
            $cfg.Run.Path       = $testsDir
            $cfg.Run.PassThru   = $true
            $cfg.Output.Verbosity = 'None'
            $r = Invoke-Pester -Configuration $cfg
        } else {
            # Pester 3/4
            $r = Invoke-Pester -Path $testsDir -PassThru -Quiet
        }
        return @{ Passed = $r.PassedCount; Total = $r.TotalCount }
    } catch { return @{ Passed = -1; Total = -1 } }
}

function Get-CommitSha([string]$root) {
    try {
        $sha = & git -C $root rev-parse --short HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and $sha) { return $sha.Trim() }
    } catch {}
    $script:LASTEXITCODE = 0
    return 'unknown'
}

function Get-MirrorFreshness([string]$root) {
    $mirrorsDir = Join-Path $root 'template\docs\chat-only-skills'
    if (-not (Test-Path $mirrorsDir)) {
        return @{ FreshCount = 0; Total = 0; OldestVersion = ''; CliVersion = '' }
    }
    $cliVersion = ''
    try {
        $raw = & claude --version 2>$null
        if ($raw -and "$raw" -match '(\d+\.\d+\.\d+)') { $cliVersion = $Matches[1] }
    } catch {}

    $files    = @(Get-ChildItem $mirrorsDir -Filter '*.md')
    $total    = $files.Count
    $fresh    = 0
    $versions = [System.Collections.Generic.List[string]]::new()

    foreach ($f in $files) {
        $fc = [System.IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)
        if ($fc -match 'synkad-fran-cli-version:\s*"([^"]+)"') {
            $fv = $Matches[1]
            $versions.Add($fv)
            if (-not $cliVersion -or $fv -eq $cliVersion) { $fresh++ }
        }
    }

    $oldestVer = if ($versions.Count -gt 0) {
        ($versions | Sort-Object { try { [version]$_ } catch { [version]'0.0.0' } } |
            Select-Object -First 1)
    } else { '' }

    return @{ FreshCount = $fresh; Total = $total; OldestVersion = $oldestVer; CliVersion = $cliVersion }
}

function Get-AdrCount([string]$root) {
    $dir = Join-Path $root 'docs\adr'
    if (-not (Test-Path $dir)) { return 0 }
    return (Get-ChildItem $dir -Filter '*.md' | Measure-Object).Count
}

function Get-RecentActivity([string]$root) {
    try {
        $log = & git -C $root log --oneline -5 2>$null
        if ($log) { return ($log -join ' | ') }
    } catch {}
    return 'Ej tillgänglig'
}

# ─── Procentmodell ────────────────────────────────────────────────────────────

function Compute-OverallProgress {
    param(
        [object]$Steps,
        [hashtable]$GapStatusMap,
        [object]$IssueDataList
    )

    $gapWeights = @{
        'untriaged'  = 0.0
        'grilling'   = 0.25
        'designed'   = 0.5
        'on-runlist' = 0.75
        'done'       = 1.0
        'deferred'   = 1.0
    }

    $workSteps = @($Steps | Where-Object { $_.Number -ge 1 })
    $total     = $workSteps.Count
    if ($total -eq 0) {
        $formula = "Inga steg i plan-to-done.md"
        return @{ Pct = 0.0; Formula = $formula; TotalSteps = 0; DoneSteps = 0 }
    }

    $contrib   = 0.0
    $doneCount = 0

    foreach ($step in $workSteps) {
        $tid    = $step.TrackId
        $status = if ($GapStatusMap -and $GapStatusMap.ContainsKey($tid)) { $GapStatusMap[$tid] } else { 'untriaged' }
        $status = $status.ToLower()

        if ($status -eq 'done' -or $status -eq 'deferred') {
            $contrib += 1.0
            $doneCount++
            continue
        }

        $w = if ($gapWeights.ContainsKey($status)) { $gapWeights[$status] } else { 0.0 }

        if ($status -eq 'on-runlist') {
            $stepIssues = @($IssueDataList | Where-Object { $_.TrackId -eq $tid })
            if ($stepIssues.Count -gt 0) {
                $closed = @($stepIssues | Where-Object { $_.State -eq 'CLOSED' }).Count
                $w = 0.75 * ($closed / $stepIssues.Count)
            }
        }

        $contrib += $w
    }

    $pct = [math]::Round($contrib / $total * 100, 1)

    $formulaText = "Formel: (avklarade steg + pågående stegets delframdrift) / totala steg x 100`n" +
                   "Vikter: untriaged=0 * grilling=0.25 * designed=0.5 * on-runlist=0.75 * done=1.0`n" +
                   "on-runlist-justering: vikten multipliceras med (stängda issues / totala issues för steget)`n" +
                   "Avklarade steg: $doneCount / $total"

    return @{
        Pct        = $pct
        Formula    = $formulaText
        TotalSteps = $total
        DoneSteps  = $doneCount
    }
}

# ─── Render ───────────────────────────────────────────────────────────────────

function Render-StatusReport {
    param(
        [pscustomobject]$Model,
        [string]$Template
    )

    $pct      = $Model.Progress.Pct
    $barWidth = [math]::Min($pct, 100)
    $testStr  = if ($Model.TestPassed -ge 0 -and $Model.TestTotal -ge 0) {
        "$($Model.TestPassed) / $($Model.TestTotal) gröna"
    } else { "Ej körd" }

    $html = $Template
    $html = $html.Replace('%PCT%',             "$pct%")
    $html = $html.Replace('%BAR_WIDTH%',       "$barWidth%")
    $html = $html.Replace('%FORMULA%',         ($Model.Progress.Formula -replace "`n", '<br>'))
    $html = $html.Replace('%GENERATED_AT%',    $Model.GeneratedAt)
    $html = $html.Replace('%COMMIT_SHA%',      $Model.CommitSha)
    $html = $html.Replace('%CURRENT_FOCUS%',   $Model.CurrentFocus)
    $html = $html.Replace('%STEPS_DONE%',      "$($Model.StepsDone)")
    $html = $html.Replace('%STEPS_TOTAL%',     "$($Model.StepsTotal)")
    $html = $html.Replace('%ISSUES_CLOSED%',   "$($Model.IssuesClosed)")
    $html = $html.Replace('%ISSUES_TOTAL%',    "$($Model.IssuesTotal)")
    $html = $html.Replace('%TRACKS_DONE%',     "$($Model.TracksDone)")
    $html = $html.Replace('%TRACKS_TOTAL%',    "$($Model.TracksTotal)")
    $html = $html.Replace('%TEST_STR%',        $testStr)
    $html = $html.Replace('%OPEN_BUGS%',       "$($Model.OpenBugs)")
    $html = $html.Replace('%ADR_COUNT%',       "$($Model.AdrCount)")
    $html = $html.Replace('%BLOCKERS%',        $Model.Blockers)
    $html = $html.Replace('%RECENT_ACTIVITY%', $Model.RecentActivity)
    $html = $html.Replace('%PHASE_ROWS%',      $Model.PhaseStatuses)
    $html = $html.Replace('%FORECAST%',        $Model.Forecast)
    $html = $html.Replace('%HEALTH_STATUS%',     $Model.HealthStatus)
    $html = $html.Replace('%MIRROR_FRESHNESS%', $Model.MirrorFreshness)
    return $html
}

# ─── Main (körs ej vid dot-source) ───────────────────────────────────────────

if ($MyInvocation.InvocationName -ne '.') {

    if (-not $RepoRoot) {
        $RepoRoot = Split-Path -Parent $PSScriptRoot
    }
    $RepoRoot = $RepoRoot.TrimEnd('\', '/')

    $logsDir = Join-Path $RepoRoot 'logs'
    if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }
    $logFile = Join-Path $logsDir 'status-report_log.txt'

    function Write-Log([string]$msg) {
        $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
        Write-Host $line
        [System.IO.File]::AppendAllText($logFile, "$line`n", $utf8NoBom)
    }

    Write-Log "Update-StatusReport start — RepoRoot=$RepoRoot"

    $nastaPointer = Get-NastaPointer $RepoRoot
    $steps        = Get-PlanSteps $RepoRoot
    $gapMap       = Get-GapStatusMap $RepoRoot
    $issueData    = Get-IssueData $RepoRoot $IssueStateJson
    $testCounts   = Get-TestCounts $RepoRoot $TestPassedOverride $TestTotalOverride
    $mirrorData   = Get-MirrorFreshness $RepoRoot
    $commitSha    = Get-CommitSha $RepoRoot
    $adrCount     = Get-AdrCount $RepoRoot
    $recentAct    = Get-RecentActivity $RepoRoot

    $progress     = Compute-OverallProgress -Steps $steps -GapStatusMap $gapMap -IssueDataList $issueData

    $allIssues    = @($issueData)
    $closedIssues = @($allIssues | Where-Object { $_.State -eq 'CLOSED' })
    $openBugs     = @($allIssues | Where-Object { $_.IsBug -and $_.State -eq 'OPEN' })
    $blockers     = @($allIssues | Where-Object { $_.IsBlocked -and $_.State -eq 'OPEN' })
    $tracksDone   = @($gapMap.Values | Where-Object { $_ -eq 'done' -or $_ -eq 'deferred' }).Count
    $tracksTotal  = $gapMap.Count

    $phaseStatuses = @(
        @{ Name = 'Fas 0 — Tracker-synk';                        Done = $true }
        @{ Name = 'Fas 1 — Strategi & livscykel (A)';            Done = ($gapMap['A1'] -eq 'done' -and $gapMap['A2'] -eq 'done') }
        @{ Name = 'Fas 2 — Projektstruktur & specformat (B)';    Done = ($gapMap['B1'] -eq 'done' -and $gapMap['B2'] -eq 'done') }
        @{ Name = 'Fas 3 — Motor: skript, skills, agenter (C)';  Done = (@('C1','C2','C3','C4') | Where-Object { $gapMap[$_] -ne 'done' }).Count -eq 0 }
        @{ Name = 'Fas 4 — Igångsättning & dokumentation (D)';   Done = ($gapMap['D1'] -eq 'done' -and $gapMap['D2'] -eq 'done') }
        @{ Name = 'Fas 5 — Verktyg/stöd & härdning (E)';         Done = (@('E1','E2','E3') | Where-Object { $gapMap[$_] -ne 'done' }).Count -eq 0 }
    )

    $phaseRows = ($phaseStatuses | ForEach-Object {
        $badge = if ($_.Done) { '<span class="badge done">Klar</span>' } else { '<span class="badge active">Pågår</span>' }
        "<tr><td>$($_.Name)</td><td>$badge</td></tr>"
    }) -join "`n"

    $remaining    = $progress.TotalSteps - $progress.DoneSteps
    $forecast     = "Återstår $remaining steg av $($progress.TotalSteps). Antagande: 1 steg per session → ca $remaining sessioner kvar."

    $healthStatus = 'Completeness-kontroll ej körd i denna körning'
    $completenessScript = Join-Path $RepoRoot 'setup\Test-PipelineProjectCompleteness.ps1'
    if (Test-Path $completenessScript) {
        try {
            $cOut = & $completenessScript -TargetPath $RepoRoot -Json 2>$null
            $cData = $cOut | ConvertFrom-Json
            $missing = @($cData | Where-Object { $_.status -eq 'MISSING' }).Count
            $healthStatus = if ($missing -eq 0) {
                "E1 completeness: OK ($($cData.Count) noder verifierade)"
            } else {
                "E1 completeness: $missing noder saknas"
            }
        } catch { $healthStatus = 'Completeness-kontroll misslyckades (körningsfel)' }
    }

    $blockerText = if ($blockers.Count -gt 0) {
        ($blockers | ForEach-Object { "#$($_.Number) $($_.Title)" }) -join '; '
    } else { 'Inga kända blockerare' }

    $mirrorText = if ($mirrorData.Total -gt 0) {
        $cliStr = if ($mirrorData.CliVersion) { ", CLI $($mirrorData.CliVersion)" } else { '' }
        "Speglar: $($mirrorData.FreshCount)/$($mirrorData.Total) färska, äldsta version $($mirrorData.OldestVersion)$cliStr"
    } else { 'Inga spegelkroppar hittades' }

    $model = [pscustomobject]@{
        Progress      = $progress
        CurrentFocus  = $nastaPointer
        StepsDone     = $progress.DoneSteps
        StepsTotal    = $progress.TotalSteps
        IssuesClosed  = $closedIssues.Count
        IssuesTotal   = $allIssues.Count
        TracksDone    = $tracksDone
        TracksTotal   = $tracksTotal
        TestPassed    = $testCounts.Passed
        TestTotal     = $testCounts.Total
        OpenBugs      = $openBugs.Count
        AdrCount      = $adrCount
        Blockers      = $blockerText
        RecentActivity = $recentAct
        PhaseStatuses = $phaseRows
        Forecast      = $forecast
        HealthStatus    = $healthStatus
        MirrorFreshness = $mirrorText
        GeneratedAt     = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
        CommitSha     = $commitSha
    }

    $templatePath = Join-Path $PSScriptRoot 'status-report-template.html'
    if (-not (Test-Path $templatePath)) {
        Write-Log "FEL: HTML-mall saknas på $templatePath"; exit 1
    }
    $template = [System.IO.File]::ReadAllText($templatePath, [Text.Encoding]::UTF8)
    $html     = Render-StatusReport -Model $model -Template $template

    $outDir   = Join-Path $RepoRoot 'docs\status'
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
    $outPath  = Join-Path $outDir 'index.html'
    [System.IO.File]::WriteAllText($outPath, $html, $utf8NoBom)

    Write-Log "Rapport skriven → $outPath ($($progress.Pct)%)"
    Write-Log "Steg: $($progress.DoneSteps)/$($progress.TotalSteps) | Issues: $($closedIssues.Count)/$($allIssues.Count) | Spår: $tracksDone/$tracksTotal | ADR: $adrCount"
    if ($testCounts.Passed -ge 0) { Write-Log "Tester: $($testCounts.Passed)/$($testCounts.Total) gröna" }
    Write-Log "Update-StatusReport klar"
    exit 0
}
