$ErrorActionPreference='Stop'
if($args.Count-eq0){throw 'Usage: invoke-toolchain.ps1 <command> [arguments]'}
$Command=[string]$args[0]
$ForwardedArgs=if($args.Count-gt1){@($args[1..($args.Count-1)])}else{@()}
$ProjectRoot=Split-Path -Parent $PSScriptRoot
$NodeHome=Join-Path $ProjectRoot '.tools\node-v24.17.0-win-x64'
$NodeExe=Join-Path $NodeHome 'node.exe';$NpmCmd=Join-Path $NodeHome 'npm.cmd'
$NpmCli=Join-Path $NodeHome 'node_modules\npm\bin\npm-cli.js'
if(-not(Test-Path $NodeExe)-or-not(Test-Path $NpmCli)){throw 'Project toolchain is missing. Run scripts\bootstrap-toolchain.ps1 first.'}
$nodeVersion=(& $NodeExe --version).Trim();$npmVersion=(& $NodeExe $NpmCli --version).Trim()
if($nodeVersion-ne'v24.17.0'-or$npmVersion-ne'11.18.0'){throw "Project toolchain drifted: Node $nodeVersion, npm $npmVersion"}
$env:PATH="$NodeHome;$env:PATH"
if($Command-eq'node'){& $NodeExe $ForwardedArgs}
elseif($Command-eq'npm'){& $NodeExe $NpmCli $ForwardedArgs}
else{& $Command $ForwardedArgs}
exit $LASTEXITCODE
