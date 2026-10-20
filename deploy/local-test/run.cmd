@echo off
rem ARSM teszt supervisor (cmd, ~4 MB instead of a resident PowerShell): run.cmd gate^|tunnel; restarts the process 3 s after it exits,
rem doubling to 60 s while it dies within 30 s; output goes to logs\<service>.log. Only the kit section and :service differ between kits.
setlocal DisableDelayedExpansion
set "SVC=%~1"
set "HERE=%~dp0"

rem ---- kit section: services and constants ----
set "SERVICES=gate tunnel"
set "CLOUDFLARED=%HERE%bin\cloudflared.exe"
set "TUNNELCONFIG=%HERE%cloudflared.yml"
rem The kit's own gate copy, else the repository's (when this kit is deploy\local-test of a clone).
set "GATE=%HERE%gate.mjs"
if not exist "%GATE%" set "GATE=%HERE%..\gate\gate.mjs"
rem ---- end of the kit section ----

set "OK="
for %%s in (%SERVICES%) do if /i "%%s"=="%SVC%" set "OK=1"
if not defined OK exit /b 2
set "LOG=%HERE%logs\%SVC%.log"
if not exist "%HERE%logs" mkdir "%HERE%logs"
set DELAY=3

:loop
set "DIR="
set "CMDLINE="
set "IDLE=nothing to run"
call :service
rem Rotate at 20 MB.
if exist "%LOG%" for %%F in ("%LOG%") do if %%~zF GTR 20971520 move /y "%LOG%" "%LOG%.1" >nul
call :ts
if not defined CMDLINE (
  >>"%LOG%" echo ===== %TS% %IDLE%; waiting
  ping -n 61 127.0.0.1 >nul
  goto loop
)
>>"%LOG%" echo ===== %TS% start: %CMDLINE%
call :secs T0
pushd "%DIR%" || goto fail
%CMDLINE% >>"%LOG%" 2>&1
set CODE=%ERRORLEVEL%
popd
:after
call :secs T1
set /a RAN=T1-T0
if %RAN% LSS 0 set /a RAN+=86400
if %RAN% GEQ 30 set DELAY=3
if %RAN% LSS 30 set /a DELAY*=2
if %DELAY% GTR 60 set DELAY=60
call :ts
>>"%LOG%" echo ===== %TS% exited with %CODE%; restarting in %DELAY% s
set /a PINGS=DELAY+1
ping -n %PINGS% 127.0.0.1 >nul
goto loop

:fail
set CODE=1
goto after

rem Timestamp in the log's yyyy-MM-dd HH:mm:ss format (node, falling back to the locale date).
:ts
set "TS="
for /f "usebackq delims=" %%T in (`node -p "new Date().toLocaleString('sv-SE')" 2^>nul`) do set "TS=%%T"
if not defined TS set "TS=%date% %time:~0,8%"
exit /b 0

rem Seconds since midnight into the variable named by %1.
:secs
for /f "tokens=1-3 delims=:,. " %%a in ("%time%") do set /a %1=(100%%a %% 100)*3600+(100%%b %% 100)*60+(100%%c %% 100)
exit /b 0

rem ---- kit section: DIR and CMDLINE of each service (CMDLINE left empty = nothing to run yet, IDLE says why) ----
:service
if /i "%SVC%"=="gate" (
  set "DIR=%HERE%"
  set "GATE_PORT=18081"
  set "UPSTREAM_PORT=18080"
  rem The console goes into logs\gate.log here; gate.env (written by setup.ps1) names the .env that holds GATE_TOKEN.
  set "GATE_LOG_FILE=off"
  set CMDLINE=node --env-file="%HERE%gate.env" "%GATE%"
)
if /i "%SVC%"=="tunnel" (
  set "DIR=%HERE%"
  set CMDLINE="%CLOUDFLARED%" tunnel --no-autoupdate --config "%TUNNELCONFIG%" run
)
exit /b 0
