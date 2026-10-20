# ARSM teszt: idempotent one-command setup (tunnel, DNS, gate token, tasks, auto-deploy), no admin needed; ends with teszt.ps1 on (-Off: off).
# powershell -ExecutionPolicy Bypass -File <kit>\setup.ps1 [-Off] [-RepoPath <repo>] [-HostName <host>] [-TunnelName <name>] [-OriginCert <pem>]
param(
    [string]$HostName = "teszt.arsm.hu",
    [string]$TunnelName = "arsm-teszt",
    [string]$OriginCert = "$env:USERPROFILE\.cloudflared\cert-arsm.pem",
    [string]$RepoPath = "",
    # Register and configure everything but leave the kit off (every task disabled, containers stopped).
    [switch]$Off
)
$ErrorActionPreference = "Stop"
$Here = $PSScriptRoot
$Run = Join-Path $Here "run.cmd"   # cmd supervisor (~4 MB each), the same as in the MaKoncert kit
$Switch = Join-Path $Here "teszt.ps1"
$Cloudflared = Join-Path $Here "bin\cloudflared.exe"
$Config = Join-Path $Here "cloudflared.yml"
$Credentials = Join-Path $Here "$TunnelName.json"
# Task Scheduler folder \Automations\, names "ARSM teszt - <What>" (kit.psd1 names the same ones for teszt.ps1)
$TaskPath = "\Automations\"
$Tasks = [ordered]@{ gate = "ARSM teszt - Gate"; tunnel = "ARSM teszt - Tunnel" }
$DeployTask = "ARSM teszt - Deploy"
# Names used before 2026-10-20 (task root folder); removed when this account is allowed to.
$LegacyTasks = @("ARSM teszt tunnel", "ARSM teszt gate", "ARSM mini-prod deploy")
$Descriptions = @{
    gate   = "ARSM teszt: token gate (gate.mjs) on 127.0.0.1:18081 -> web container on 18080; run.cmd restarts it. On/off: teszt.ps1."
    tunnel = "ARSM teszt: Cloudflare tunnel $TunnelName (https://$HostName -> gate on 18081); run.cmd restarts it. On/off: teszt.ps1."
    deploy = "ARSM teszt: every 5 minutes deploys origin/main (green CI) into the arsm-tunnel-* containers and takes the daily pg_dump backup (deploy.py). On/off: teszt.ps1."
}
$GateUrl = "http://127.0.0.1:18081"
$PublicUrl = "https://$HostName"
$EnvFile = Join-Path $Here "tunnel.env"
# Holds only GATE_ENV_FILE (a path); run.cmd passes it to node with --env-file so the gate finds the project .env.
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

# run.cmd starts the kit's own gate copy, else ..\gate\gate.mjs (a kit inside the repository's deploy\local-test).
function Ensure-Gate {
    Step "Token gate script"
    if ((Test-Path (Join-Path $Here "gate.mjs")) -or (Test-Path (Join-Path $Here "..\gate\gate.mjs"))) { return }
    $source = Join-Path $Repo "deploy\gate"
    if (-not (Test-Path (Join-Path $source "gate.mjs"))) { throw "Missing $source\gate.mjs (the token gate)." }
    Copy-Item (Join-Path $source "gate*.mjs") $Here
    Copy-Item (Join-Path $source "gate-assets") $Here -Recurse -Force
    Write-Host "Copied the gate from $source into the kit."
}

# Returns the HTTP status of a GET; on Windows PowerShell 5.1 a 401 throws, so read the code from the exception.
function Get-StatusCode($url) {
    try { return [int](Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 10).StatusCode }
    catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { return 0 } }
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
    [IO.File]::WriteAllText($GatePointerFile, "GATE_ENV_FILE=$GateEnvFile`n", $Utf8)
}

# Registered disabled: teszt.ps1 on enables and starts them (persistently), teszt.ps1 off disables them again.
function Settings() {
    New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -Disable
}

function Register-Service($name) {
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
    # conhost --headless keeps the console windowless while the task still owns the process.
    $arguments = "--headless cmd.exe /d /s /c `"`"$Run`" $name`""
    $action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument $arguments -WorkingDirectory $Here
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    Register-ScheduledTask -TaskPath $TaskPath -TaskName $Tasks[$name] -Description $Descriptions[$name] -Action $action -Trigger $trigger `
        -Settings (Settings) -Principal $principal -Force | Out-Null
}

function Register-Deploy {
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
    # The real interpreter, not the WindowsApps alias; deploy.py starts git and docker with CREATE_NO_WINDOW.
    $python = (& python -c "import sys; print(sys.executable)").Trim()
    $action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument "--headless `"$python`" `"$(Join-Path $Here 'deploy.py')`"" -WorkingDirectory $Here
    $every5 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 45) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -StartWhenAvailable -MultipleInstances IgnoreNew -Disable
    Register-ScheduledTask -TaskPath $TaskPath -TaskName $DeployTask -Description $Descriptions.deploy -Action $action -Trigger $every5 `
        -Settings $settings -Principal $principal -Force | Out-Null
}

# An old-name task registered from an elevated shell can only be removed from an elevated shell.
function Remove-LegacyTasks {
    foreach ($name in $LegacyTasks) {
        if (-not (Get-ScheduledTask -TaskPath "\" -TaskName $name -ErrorAction SilentlyContinue)) { continue }
        try { Unregister-ScheduledTask -TaskPath "\" -TaskName $name -Confirm:$false; Write-Host "Removed the old task '$name'." }
        catch { Write-Warning "Could not remove the old task '\$name'; in an elevated PowerShell run: Unregister-ScheduledTask -TaskPath '\' -TaskName '$name' -Confirm:`$false" }
    }
}

function Invoke-Switch($action, [string[]]$extra = @()) {
    Step "teszt.ps1 $action $extra"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Switch $action @extra
    if ($LASTEXITCODE -ne 0) { throw "teszt.ps1 $action failed." }
}

function Show-LoginLink {
    $token = Get-EnvValue "GATE_TOKEN" $GateEnvFile
    Step "Owner login link"
    Write-Host "$PublicUrl/?access=$token" -ForegroundColor Yellow
    Write-Host "This link is secret: it sets a 30-day cookie per browser. It is printed only here, never logged."
}

$Repo = Resolve-RepoPath
# GATE_TOKEN lives in the project's gitignored root .env (like MaKoncert's app\web\.env).
$GateEnvFile = Join-Path $Repo ".env"
Wait-Docker
if (Get-ScheduledTask -TaskPath $TaskPath -TaskName $Tasks.gate -ErrorAction SilentlyContinue) { Invoke-Switch "off" }
Ensure-Gate
$tunnelId = Ensure-Tunnel
Write-Config $tunnelId
$urlChanged = Ensure-PublicUrl
if ($urlChanged) {
    Step "Redeploying with the new URL (web rebuild + API CORS)"
    python (Join-Path $Here "deploy.py") --force
}
Ensure-GateToken
Step "Scheduled tasks in $TaskPath (registered disabled; teszt.ps1 switches them)"
foreach ($name in $Tasks.Keys) { Register-Service $name }
Register-Deploy
Remove-LegacyTasks
if ($Off) { Invoke-Switch "off"; return }
Invoke-Switch "on"
Show-LoginLink
