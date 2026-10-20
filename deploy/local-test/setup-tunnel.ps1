# ARSM local test instance: one-command setup of the fixed hostname, token gate, tunnel, autostart and auto-deploy.
# Idempotent: safe to re-run; see deploy/docs/deployment-local-test.md for what each step does.
param(
    [string]$HostName = "teszt.arsm.hu",
    [string]$TunnelName = "arsm-teszt",
    [string]$OriginCert = "$env:USERPROFILE\.cloudflared\cert-arsm.pem",
    [string]$RepoPath = ""
)
$ErrorActionPreference = "Stop"
$Here = $PSScriptRoot
$Cloudflared = Join-Path $Here "bin\cloudflared.exe"
$Config = Join-Path $Here "cloudflared.yml"
$Credentials = Join-Path $Here "$TunnelName.json"
$TunnelLog = Join-Path $Here "cloudflared.log"
$TaskPath = "\Automations\"
$TunnelTask = "ARSM teszt - Tunnel"
$GateTask = "ARSM teszt - Gate"
$DeployTask = "ARSM teszt - Deploy"
# Names used before 2026-10-20 (task root folder); removed when this account is allowed to.
$LegacyTasks = @("ARSM teszt tunnel", "ARSM teszt gate", "ARSM mini-prod deploy")
$GateUrl = "http://127.0.0.1:18081"
$PublicUrl = "https://$HostName"
$EnvFile = Join-Path $Here "tunnel.env"
# Holds only GATE_ENV_FILE (a path); node loads it with --env-file so the gate finds the project .env.
$GatePointerFile = Join-Path $Here "gate.env"
$Utf8 = New-Object System.Text.UTF8Encoding $false

function Step($text) { Write-Host "==> $text" -ForegroundColor Cyan }

# Read and write .env files as UTF-8 without BOM: Get-Content/Set-Content on PowerShell 5.1 would mangle accents.
function Read-EnvText($path) { if (Test-Path $path) { return [IO.File]::ReadAllText($path, $Utf8) } else { return "" } }

# Last KEY=VALUE line wins, trimmed with matching quotes stripped (as the gate reads it); $null when absent.
function Get-EnvValue($name, $path = $EnvFile) {
    $found = $null
    foreach ($line in ((Read-EnvText $path) -split "`r?`n")) {
        if ($line -notmatch "^\s*$name\s*=(.*)$") { continue }
        $value = $Matches[1].Trim()
        if ($value.Length -ge 2 -and $value.Substring(0, 1) -in @('"', "'") -and $value.Substring(0, 1) -eq $value.Substring($value.Length - 1)) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $found = $value
    }
    return $found
}

# Replaces the KEY line or appends one, keeping the file's encoding, line endings and every other line.
function Set-EnvValue($path, $name, $value) {
    $text = Read-EnvText $path
    $nl = if ($text -match "`r`n") { "`r`n" } else { "`n" }
    $pattern = "(?m)^[ `t]*$name[ `t]*=[^`r`n]*"
    if ($text -match $pattern) { $text = [regex]::Replace($text, $pattern, "$name=$value") }
    else {
        if ($text.Length -gt 0 -and -not $text.EndsWith("`n")) { $text += $nl }
        $text += "$name=$value$nl"
    }
    [IO.File]::WriteAllText($path, $text, $Utf8)
}

function Remove-EnvValue($path, $name) {
    $text = Read-EnvText $path
    $pattern = "(?m)^[ `t]*$name[ `t]*=[^`r`n]*(`r?`n)?"
    if ($text -match $pattern) { [IO.File]::WriteAllText($path, [regex]::Replace($text, $pattern, ""), $Utf8) }
}

# -RepoPath (saved as ARSM_REPO in tunnel.env), else ARSM_REPO, else the repository this script lives in.
function Resolve-RepoPath {
    if ($RepoPath) {
        $full = (Resolve-Path $RepoPath).Path
        if ((Get-EnvValue "ARSM_REPO") -ne $full) { Set-EnvValue $EnvFile "ARSM_REPO" $full }
        return $full
    }
    $configured = if ($env:ARSM_REPO) { $env:ARSM_REPO } else { Get-EnvValue "ARSM_REPO" }
    if ($configured) { return $configured }
    $parent = Split-Path (Split-Path $Here -Parent) -Parent
    if (Test-Path (Join-Path $parent ".git")) { return $parent }
    throw "Unknown repository path: pass -RepoPath <ARSM repository> once (it is saved as ARSM_REPO in tunnel.env)."
}

# The kit's own copy next to this script, else the tracked gate in the repository (deploy/gate).
function Resolve-GateScript {
    $local = Join-Path $Here "gate.mjs"
    if (Test-Path $local) { return $local }
    return (Join-Path $Repo "deploy\gate\gate.mjs")
}

# Returns the HTTP status of a GET; on Windows PowerShell 5.1 a 401 throws, so read the code from the exception.
function Get-StatusCode($url) {
    try { return [int](Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 10).StatusCode }
    catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { return 0 } }
}

function Wait-Url($url, $expected, $seconds) {
    for ($i = 0; $i -lt $seconds / 5; $i++) {
        if ((Get-StatusCode $url) -eq $expected) { return $true }
        Start-Sleep 5
    }
    return $false
}

function Test-Docker { cmd /c "docker info >nul 2>&1"; return $LASTEXITCODE -eq 0 }

function Wait-Docker {
    Step "Docker"
    if (Test-Docker) { return }
    Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep 5
        if (Test-Docker) { return }
    }
    throw "Docker Desktop did not start within 5 minutes."
}

function Ensure-Tunnel {
    Step "Named tunnel '$TunnelName'"
    if (-not (Test-Path $OriginCert)) { throw "Missing origin cert $OriginCert - run: $Cloudflared tunnel login" }
    if (-not (Test-Path $Credentials)) {
        & $Cloudflared --origincert $OriginCert tunnel create --credentials-file $Credentials $TunnelName | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "tunnel create failed" }
    }
    $json = (& $Cloudflared --origincert $OriginCert tunnel list --name $TunnelName --output json) -join "`n"
    $info = @($json | ConvertFrom-Json)
    if ($info.Count -eq 0) { throw "Tunnel '$TunnelName' not found in the Cloudflare account." }
    Step "DNS route $HostName"
    & $Cloudflared --origincert $OriginCert tunnel route dns --overwrite-dns $TunnelName $HostName | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "route dns failed" }
    return $info[0].id
}

function Write-Config($tunnelId) {
    Step "Config $Config"
    @(
        "tunnel: $tunnelId",
        "credentials-file: $Credentials",
        "ingress:",
        "  - hostname: $HostName",
        "    service: $GateUrl",
        "  - service: http_status:404"
    ) | Set-Content -Path $Config -Encoding ascii
    & $Cloudflared tunnel --config $Config ingress validate | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "ingress validate failed" }
}

function Ensure-PublicUrl {
    Step "PUBLIC_URL = $PublicUrl"
    if ((Get-EnvValue "PUBLIC_URL") -eq $PublicUrl) { return $false }
    Set-EnvValue $EnvFile "PUBLIC_URL" $PublicUrl
    return $true
}

# Keeps a usable token (moving an older one out of tunnel.env keeps every issued cookie valid), else generates one.
function Ensure-GateToken {
    Step "GATE_TOKEN in $GateEnvFile"
    $current = Get-EnvValue "GATE_TOKEN" $GateEnvFile
    $legacy = Get-EnvValue "GATE_TOKEN" $EnvFile
    if ($current -and $current.Length -ge 32) {
        Write-Host "GATE_TOKEN: present"
    } elseif ($legacy -and $legacy.Length -ge 32) {
        Set-EnvValue $GateEnvFile "GATE_TOKEN" $legacy
        Write-Host "GATE_TOKEN: moved from tunnel.env"
    } else {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        $rng.Dispose()
        $token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
        Set-EnvValue $GateEnvFile "GATE_TOKEN" $token
        Write-Host "GATE_TOKEN: generated"
    }
    if ($null -ne $legacy) { Remove-EnvValue $EnvFile "GATE_TOKEN" }
}

function Register-KitTask($name, $description, $action, $trigger, $settings, $principal) {
    $task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $description
    Register-ScheduledTask -TaskPath $TaskPath -TaskName $name -InputObject $task -Force | Out-Null
}

function Register-GateTask($principal, $settings) {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $node) { throw "node.exe not found on PATH; the token gate needs Node.js." }
    if (-not (Test-Path $GateScript)) { throw "Missing $GateScript (the token gate)." }
    [IO.File]::WriteAllText($GatePointerFile, "GATE_ENV_FILE=$GateEnvFile`n", $Utf8)
    $arguments = "--headless `"$node`" --env-file=`"$GatePointerFile`" `"$GateScript`""
    $action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument $arguments -WorkingDirectory $Here
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $description = "ARSM local test instance ($HostName): at logon starts the token gate (node gate.mjs, headless) on 127.0.0.1:18081 in front of arsm-tunnel-web."
    Register-KitTask $GateTask $description $action $trigger $settings $principal
}

function Ensure-Tasks {
    Step "Scheduled tasks in $TaskPath"
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 `
        -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    # conhost --headless keeps the console app windowless while the task still owns the process.
    $arguments = "--headless `"$Cloudflared`" tunnel --no-autoupdate --config `"$Config`" --logfile `"$TunnelLog`" run"
    $action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument $arguments -WorkingDirectory $Here
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $description = "ARSM local test instance ($HostName): at logon starts the Cloudflare named tunnel $TunnelName (cloudflared, headless) that forwards $HostName to the token gate."
    Register-KitTask $TunnelTask $description $action $trigger $settings $principal
    Register-GateTask $principal $settings
    if (-not (Get-ScheduledTask -TaskPath $TaskPath -TaskName $DeployTask -ErrorAction SilentlyContinue)) {
        $pythonw = Join-Path (Split-Path (Get-Command python).Source) "pythonw.exe"
        $deployAction = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$(Join-Path $Here 'deploy.py')`"" -WorkingDirectory $Here
        $every5 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
        # Runs on battery, never overlaps itself, and is killed if it hangs for more than 30 minutes.
        $deploySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew `
            -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
        $description = "ARSM local test instance ($HostName): every 5 minutes runs deploy.py, which redeploys the arsm-tunnel-* Docker stack when origin/main has a new commit with green CI, and takes daily pg_dump backups."
        $task = New-ScheduledTask -Action $deployAction -Trigger $every5 -Settings $deploySettings -Description $description
        Register-ScheduledTask -TaskPath $TaskPath -TaskName $DeployTask -InputObject $task | Out-Null
    }
}

# An old-name task registered from an elevated shell can only be removed from an elevated shell.
function Remove-LegacyTasks {
    foreach ($name in $LegacyTasks) {
        if (-not (Get-ScheduledTask -TaskPath "\" -TaskName $name -ErrorAction SilentlyContinue)) { continue }
        try { Unregister-ScheduledTask -TaskPath "\" -TaskName $name -Confirm:$false; Write-Host "Removed the old task '$name'." }
        catch { Write-Warning "Could not remove the old task '\$name'; in an elevated PowerShell run: Unregister-ScheduledTask -TaskPath '\' -TaskName '$name' -Confirm:`$false" }
    }
}

# Kills only this kit's processes and their conhost hosts: the MaKoncert gate and tunnel run on this machine too.
function Stop-KitProcess($exe, $marker) {
    $mine = "*$([WildcardPattern]::Escape($marker))*"
    Get-CimInstance Win32_Process | Where-Object { $_.Name -in @($exe, "conhost.exe") -and $_.CommandLine -like $mine } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Restart-Gate {
    Step "Starting the gate"
    $task = Get-ScheduledTask -TaskPath $TaskPath -TaskName $GateTask
    if ($task.State -eq "Running") { Stop-ScheduledTask -TaskPath $TaskPath -TaskName $GateTask }
    Stop-KitProcess "node.exe" $GateScript
    Start-Sleep 2
    Start-ScheduledTask -TaskPath $TaskPath -TaskName $GateTask
    if (-not (Wait-Url "$GateUrl/alive" 200 60)) {
        Write-Warning "$GateUrl/alive did not answer 200 within a minute; see $(Join-Path (Split-Path $GateScript) 'logs\gate.log'). Continuing."
    }
}

function Restart-Tunnel {
    Step "Starting the tunnel"
    Stop-KitProcess "cloudflared.exe" $Config
    Start-ScheduledTask -TaskPath $TaskPath -TaskName $TunnelTask
}

function Test-Site {
    Step "Checking $GateUrl/ and /alive (locally through the gate, 200)"
    $local = (Wait-Url "$GateUrl/" 200 60) -and (Wait-Url "$GateUrl/alive" 200 30)
    if ($local) { Write-Host "OK: the gate answers locally." -ForegroundColor Green }
    else { Write-Warning "The gate did not answer 200 locally; see the gate log and $(Join-Path $Here 'deploy.log')." }
    Step "Checking $PublicUrl/ (401 = tunnel up, gate closed without the token)"
    if (Wait-Url "$PublicUrl/" 401 120) { Write-Host "OK: $PublicUrl is up behind the gate." -ForegroundColor Green }
    else { Write-Warning "$PublicUrl/ did not answer 401 within 2 minutes; see $TunnelLog, the gate log and deploy.log." }
}

function Show-LoginLink {
    $token = Get-EnvValue "GATE_TOKEN" $GateEnvFile
    Step "Owner login link"
    Write-Host "$PublicUrl/?access=$token" -ForegroundColor Yellow
    Write-Host "This link is secret: it sets a 30-day cookie per browser. It is printed only here, never logged."
}

$Repo = Resolve-RepoPath
# GATE_TOKEN lives in the project's gitignored root .env (like MaKoncert's app\web\.env.local).
$GateEnvFile = Join-Path $Repo ".env"
$GateScript = Resolve-GateScript
Wait-Docker
$tunnelId = Ensure-Tunnel
Write-Config $tunnelId
$urlChanged = Ensure-PublicUrl
if ($urlChanged) {
    Step "Redeploying with the new URL (web rebuild + API CORS)"
    python (Join-Path $Here "deploy.py") --force
}
Ensure-GateToken
Ensure-Tasks
Remove-LegacyTasks
Restart-Gate
Restart-Tunnel
Test-Site
Show-LoginLink
