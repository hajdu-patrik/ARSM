# What teszt.ps1 (identical in every kit) switches: read with Import-PowerShellDataFile. setup.ps1 registers the same tasks.
@{
    Name       = 'ARSM teszt'
    TaskPath   = '\Automations\'
    # Task '<Name> - <Task>' runs 'run.cmd <Service>'; 'on' starts them in this order.
    Services   = @(
        @{ Service = 'gate'; Task = 'Gate' }
        @{ Service = 'tunnel'; Task = 'Tunnel' }
    )
    # Task '<Name> - <DeployTask>' runs the deploy script every 5 minutes; 'off' deletes DeployLock when it killed a deploy run.
    DeployTask = 'Deploy'
    DeployLock = 'deploy.lock'
    # Docker containers: 'on' starts them group by group before the tasks, 'off' stops them in reverse after the tasks.
    Containers = @(
        @{ Name = 'arsm-tunnel-postgres'; Group = 1; StopTimeout = 60 }
        @{ Name = 'arsm-tunnel-rustfs'; Group = 1; StopTimeout = 60 }
        @{ Name = 'arsm-tunnel-api'; Group = 2; StopTimeout = 10 }
        @{ Name = 'arsm-tunnel-web'; Group = 2; StopTimeout = 10 }
    )
    # Checked by 'status'; 'on' waits for each (BeforeTasks: after the containers, before the tasks start).
    Health     = @(
        @{ Url = 'http://127.0.0.1:18080/alive'; Expect = 200; What = 'web + api containers'; BeforeTasks = $true }
        @{ Url = 'http://127.0.0.1:18081/alive'; Expect = 200; What = 'gate -> web' }
        @{ Url = 'https://teszt.arsm.hu/'; Expect = 401; What = 'tunnel (401 = gate closed without the token)' }
    )
}
