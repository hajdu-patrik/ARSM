# Turns this test kit on or off for good (off: every task disabled, containers restart 'no', nothing starts until 'on'), or shows its state.
# powershell -ExecutionPolicy Bypass -File <kit>\teszt.ps1 on|off|status [-Skip <service>[,<service>]]; identical in every kit, see kit.psd1.
param(
    [Parameter(Mandatory = $true, Position = 0)][ValidateSet('on', 'off', 'status')][string]$Action,
    # 'on' only: services (run.cmd names, e.g. worker) whose task stays disabled and stopped.
    [string[]]$Skip = @()
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# The real kit folder, also when this script is started through a junction (the tasks name the real path).
function Resolve-KitPath($path) {
    $item = Get-Item -LiteralPath $path
    if ($item.LinkType -in @('Junction', 'SymbolicLink')) { return ([string]@($item.Target)[0]).TrimEnd('\') }
    return $item.FullName.TrimEnd('\')
}

$Kit = Resolve-KitPath $PSScriptRoot
$Def = Import-PowerShellDataFile (Join-Path $Kit 'kit.psd1')
$TaskPath = $Def.TaskPath
$Services = @($Def.Services | ForEach-Object { [pscustomobject]@{ Service = $_.Service; Task = "$($Def.Name) - $($_.Task)" } })
$DeployTask = "$($Def.Name) - $($Def.DeployTask)"
$AllTasks = @($Services.Task) + $DeployTask
$Containers = @($Def.Containers | ForEach-Object { [pscustomobject]$_ })
$Health = @($Def.Health | ForEach-Object { [pscustomobject]$_ })
$RootNames = @('conhost.exe', 'cmd.exe', 'node.exe', 'cloudflared.exe', 'python.exe', 'pythonw.exe')
foreach ($name in $Skip) { if ($name -notin $Services.Service) { throw "Unknown service '$name' in -Skip; this kit has: $($Services.Service -join ', ')." } }

function Step($text) { Write-Host "==> $text" -ForegroundColor Cyan }

function Get-KitTask($name) { Get-ScheduledTask -TaskPath $TaskPath -TaskName $name -ErrorAction SilentlyContinue }

# HTTP status of a GET (0 = no answer); Windows PowerShell 5.1 throws on 4xx/5xx, so the code comes from the exception.
function Get-HttpStatus($url) {
    try { return [int](Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 10 -MaximumRedirection 0).StatusCode }
    catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { return 0 } }
}

function Wait-Health($check, $seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    do {
        $code = Get-HttpStatus $check.Url
        if ($code -eq $check.Expect) { return $code }
        Start-Sleep 3
    } while ((Get-Date) -lt $deadline)
    return $code
}

# Runs docker without stopping on its stderr; returns the exit code and the output lines.
function Invoke-Docker {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $out = @(& docker @args 2>&1 | ForEach-Object { "$_" }); $code = $LASTEXITCODE }
    catch { $out = @("$_"); $code = 1 }
    finally { $ErrorActionPreference = $previous }
    return [pscustomobject]@{ Code = $code; Out = $out }
}

function Test-Docker { return (Invoke-Docker info --format '{{.ServerVersion}}').Code -eq 0 }

# Name, state and restart policy of each kit container ('missing' when it does not exist).
function Get-ContainerStates {
    foreach ($c in $Containers) {
        $r = Invoke-Docker inspect -f '{{.State.Status}} {{.HostConfig.RestartPolicy.Name}}' $c.Name
        if ($r.Code -eq 0) { $state, $restart = ($r.Out[0] -split ' ', 2) } else { $state = 'missing'; $restart = '-' }
        [pscustomobject]@{ Name = $c.Name; Group = $c.Group; State = $state; Restart = $restart }
    }
}

# This process and its parents: never killed, even when their command line names the kit folder.
function Get-OwnLineage($byId) {
    $ids = @()
    $id = $PID
    while ($id -and $byId.ContainsKey($id) -and $ids -notcontains $id) { $ids += $id; $id = [int]$byId[$id].ParentProcessId }
    return $ids
}

# Every process tree whose root command line names the kit folder (conhost/cmd/node/cloudflared/python), with its service.
function Get-KitTrees {
    $all = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine, CreationDate)
    $byId = @{}
    foreach ($p in $all) { $byId[[int]$p.ProcessId] = $p }
    $own = Get-OwnLineage $byId
    $pattern = "*$([WildcardPattern]::Escape($Kit))\*"
    $isKit = { param($p) $p -and $p.Name -in $RootNames -and $p.CommandLine -like $pattern -and $own -notcontains [int]$p.ProcessId }
    $children = @{}
    foreach ($p in $all) {
        $parent = $byId[[int]$p.ParentProcessId]
        # A child is never older than its parent; an older one only reuses a dead parent's id.
        if ($parent -and $p.CreationDate -ge $parent.CreationDate) { $children[[int]$p.ParentProcessId] += @($p) }
    }
    foreach ($p in $all) {
        if (-not (& $isKit $p)) { continue }
        $parent = $byId[[int]$p.ParentProcessId]
        if ($parent -and $p.CreationDate -ge $parent.CreationDate -and (& $isKit $parent)) { continue }
        $tree = New-Object System.Collections.ArrayList
        $stack = New-Object System.Collections.Stack
        $stack.Push($p)
        while ($stack.Count) {
            $node = $stack.Pop()
            if ($own -contains [int]$node.ProcessId) { continue }
            [void]$tree.Add($node)
            foreach ($child in @($children[[int]$node.ProcessId])) { if ($child) { $stack.Push($child) } }
        }
        $service = 'other'
        if ($p.CommandLine -match 'run\.cmd"?\s+"?(\w+)') { $service = $Matches[1].ToLower() }
        elseif ($p.CommandLine -match 'deploy\.(mjs|py)') { $service = 'deploy' }
        $chain = ($tree | ForEach-Object { "$($_.Name -replace '\.exe$', '') $($_.ProcessId)" }) -join ' > '
        [pscustomobject]@{ Service = $service; Ids = @($tree | ForEach-Object { [int]$_.ProcessId }); Chain = $chain }
    }
}

# Kills the trees parent first (a dead loop cannot spawn again), then looks again for anything started meanwhile.
function Stop-KitTrees($services) {
    $killedDeploy = $false
    for ($pass = 0; $pass -lt 3; $pass++) {
        $trees = @(Get-KitTrees | Where-Object { -not $services -or $_.Service -in $services })
        if (-not $trees.Count) { break }
        foreach ($tree in $trees) {
            Write-Host "    killing $($tree.Service): $($tree.Chain)"
            foreach ($id in $tree.Ids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
            if ($tree.Service -eq 'deploy') { $killedDeploy = $true }
        }
        Start-Sleep 1
    }
    $lock = Join-Path $Kit $Def.DeployLock
    if ($killedDeploy -and $Def.DeployLock -and (Test-Path $lock)) { Remove-Item $lock -Force; Write-Host "    removed $($Def.DeployLock) of the killed deploy run" }
}

function Show-Status {
    $issues = New-Object System.Collections.ArrayList
    $trees = @(Get-KitTrees)
    $tasks = @{}
    Get-ScheduledTask -TaskPath $TaskPath -ErrorAction SilentlyContinue | ForEach-Object { $tasks[$_.TaskName] = $_ }
    Write-Host "$($Def.Name)  $Kit"
    Write-Host "Tasks ($TaskPath)"
    $enabled = 0
    foreach ($name in $AllTasks) {
        $task = $tasks[$name]
        if (-not $task) { Write-Host ("  {0,-28} missing" -f $name); [void]$issues.Add("task '$name' missing (run setup.ps1)"); continue }
        $on = $task.State -ne 'Disabled'
        if ($on) { $enabled++ }
        $run = if ($task.State -eq 'Running') { 'running' } else { 'not running' }
        Write-Host ("  {0,-28} {1,-9} {2}" -f $name, $(if ($on) { 'enabled' } else { 'disabled' }), $run)
    }
    Write-Host 'Processes (trees whose command line names the kit folder)'
    if (-not $trees.Count) { Write-Host '  none' }
    foreach ($tree in $trees) { Write-Host ("  {0,-8} {1}" -f $tree.Service, $tree.Chain) }
    foreach ($s in $Services) {
        $count = @($trees | Where-Object Service -eq $s.Service).Count
        $task = $tasks[$s.Task]
        if ($task -and $task.State -ne 'Disabled' -and $count -ne 1) { [void]$issues.Add("$($s.Service) runs $count times (expected once)") }
        if ($task -and $task.State -eq 'Disabled' -and $count) { [void]$issues.Add("$($s.Service) runs although its task is disabled") }
    }
    Write-Host 'Containers'
    $states = @()
    if (-not $Containers.Count) { Write-Host '  none' }
    elseif (-not (Test-Docker)) { Write-Host '  docker is not running'; [void]$issues.Add('docker is not running: container restart policies unknown') }
    else {
        $states = @(Get-ContainerStates)
        foreach ($c in $states) { Write-Host ("  {0,-28} {1,-9} restart={2}" -f $c.Name, $c.State, $c.Restart) }
    }
    Write-Host 'Health'
    $healthy = 0
    foreach ($check in $Health) {
        $code = Get-HttpStatus $check.Url
        if ($code -eq $check.Expect) { $healthy++ }
        $shown = if ($code) { $code } else { '---' }
        Write-Host ("  {0,-4} {1,-42} want {2}  {3}" -f $shown, $check.Url, $check.Expect, $check.What)
    }
    $running = @($states | Where-Object State -eq 'running').Count
    $autostart = @($states | Where-Object { $_.Restart -notin @('no', '-') }).Count
    if ($enabled -eq 0 -and -not $trees.Count -and $running -eq 0 -and $autostart -eq 0 -and -not $issues.Count) {
        Write-Host "State: OFF - every task disabled, nothing running, no container restarts: nothing starts until 'teszt.ps1 on'." -ForegroundColor Yellow
        return
    }
    $skipped = @($Services | Where-Object { $t = $tasks[$_.Task]; $t -and $t.State -eq 'Disabled' } | ForEach-Object Service)
    $deploy = $tasks[$DeployTask]
    if (-not $deploy -or $deploy.State -eq 'Disabled') { [void]$issues.Add('deploy task disabled') }
    if ($skipped.Count -eq $Services.Count) { [void]$issues.Add('every service task disabled'); $skipped = @() }
    if ($states.Count -and $running -ne $states.Count) { [void]$issues.Add("$running of $($states.Count) containers running") }
    if ($states.Count -and $autostart -ne $states.Count) { [void]$issues.Add('a container has restart policy no') }
    if ($healthy -ne $Health.Count) { [void]$issues.Add("$healthy of $($Health.Count) health checks as expected") }
    $note = if ($skipped.Count) { " (skipped: $($skipped -join ', '))" } else { '' }
    if (-not $issues.Count) { Write-Host "State: ON$note - tasks enabled, everything runs once and answers: it also comes back after a reboot." -ForegroundColor Green }
    else { Write-Host "State: PARTIAL$note - $($issues -join '; ')" -ForegroundColor Red }
}

function Start-Kit {
    if ($Containers.Count) {
        Step 'Containers (restart unless-stopped)'
        if (-not (Test-Docker)) { throw 'Docker is not running: start Docker Desktop, then run teszt.ps1 on again.' }
        foreach ($group in @($Containers | Group-Object Group | Sort-Object { [int]$_.Name })) {
            $names = @($group.Group | ForEach-Object Name)
            foreach ($command in @(@('update', '--restart', 'unless-stopped'), @('start'))) {
                $r = Invoke-Docker @command @names
                if ($r.Code -ne 0) { throw "docker $($command[0]) $($names -join ' ') failed: $($r.Out -join ' ')" }
            }
            Write-Host "    started $($names -join ', ')"
        }
        foreach ($check in @($Health | Where-Object { $_.BeforeTasks })) {
            $code = Wait-Health $check 180
            if ($code -ne $check.Expect) { throw "$($check.Url) answers $code instead of $($check.Expect) after 3 minutes; see docker logs." }
            Write-Host "    $($check.Url) answers $code"
        }
    }
    Step 'Service tasks (enabled: they start at every logon)'
    foreach ($s in $Services) {
        $task = Get-KitTask $s.Task
        if (-not $task) { throw "Task '$($s.Task)' is missing: run setup.ps1 first." }
        if ($s.Service -in $Skip) {
            Disable-ScheduledTask -TaskPath $TaskPath -TaskName $s.Task | Out-Null
            Stop-KitTrees @($s.Service)
            Write-Host "    $($s.Service): skipped, task disabled"
            continue
        }
        Enable-ScheduledTask -TaskPath $TaskPath -TaskName $s.Task | Out-Null
        if ((Get-KitTask $s.Task).State -eq 'Running') { Write-Host "    $($s.Service): already running"; continue }
        Stop-KitTrees @($s.Service)
        Start-ScheduledTask -TaskPath $TaskPath -TaskName $s.Task
        Write-Host "    $($s.Service): started"
    }
    Step 'Deploy task (enabled: every 5 minutes)'
    if (-not (Get-KitTask $DeployTask)) { throw "Task '$DeployTask' is missing: run setup.ps1 first." }
    Enable-ScheduledTask -TaskPath $TaskPath -TaskName $DeployTask | Out-Null
    Step 'Waiting for the health checks'
    foreach ($check in @($Health | Where-Object { -not $_.BeforeTasks })) {
        $code = Wait-Health $check 180
        if ($code -eq $check.Expect) { Write-Host "    $($check.Url) answers $code" }
        else { Write-Warning "$($check.Url) answers $code instead of $($check.Expect) after 3 minutes; see $Kit\logs." }
    }
}

function Stop-Kit {
    Step 'Tasks disabled (nothing starts at logon or on the deploy trigger)'
    foreach ($name in @($DeployTask) + @($Services.Task)[($Services.Count - 1)..0]) {
        if (Get-KitTask $name) { Disable-ScheduledTask -TaskPath $TaskPath -TaskName $name | Out-Null; Write-Host "    $name" }
    }
    Step 'Process trees of the kit'
    Stop-KitTrees $null
    foreach ($name in $AllTasks) {
        $task = Get-KitTask $name
        if ($task -and $task.State -eq 'Running') { Stop-ScheduledTask -TaskPath $TaskPath -TaskName $name }
    }
    if ($Containers.Count) {
        Step "Containers stopped (restart 'no': they stay down after a Docker or PC restart)"
        if (-not (Test-Docker)) { Write-Warning 'Docker is not running: run teszt.ps1 off again once it runs, or the containers may come back with it.'; return }
        foreach ($group in @($Containers | Group-Object Group | Sort-Object { [int]$_.Name } -Descending)) {
            $names = @($group.Group | ForEach-Object Name)
            $timeout = ($group.Group | Measure-Object StopTimeout -Maximum).Maximum
            foreach ($command in @(@('stop', '-t', "$timeout"), @('update', '--restart', 'no'))) {
                $r = Invoke-Docker @command @names
                if ($r.Code -ne 0) { Write-Warning "docker $($command[0]) $($names -join ' '): $($r.Out -join ' ')" }
            }
            Write-Host "    stopped $($names -join ', ')"
        }
    }
}

switch ($Action) {
    'on' { Start-Kit; Show-Status }
    'off' { Stop-Kit; Show-Status }
    'status' { Show-Status }
}
