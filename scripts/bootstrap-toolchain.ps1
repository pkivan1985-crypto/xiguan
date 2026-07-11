[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$NodeVersion = '24.17.0'; $NpmVersion = '11.18.0'
$ArchiveName = "node-v$NodeVersion-win-x64.zip"
$ArchiveUrl = "https://nodejs.org/dist/v$NodeVersion/$ArchiveName"
$ExpectedSha256 = 'f2aa33b35b75aca5f3f7b85675a6f6423201053e9381911e64961f3bda2528ab'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ToolsRoot = [IO.Path]::GetFullPath((Join-Path $ProjectRoot '.tools'))
$DownloadsRoot = [IO.Path]::GetFullPath((Join-Path $ToolsRoot 'downloads'))
$NodeHome = [IO.Path]::GetFullPath((Join-Path $ToolsRoot "node-v$NodeVersion-win-x64"))
$ArchivePath = [IO.Path]::GetFullPath((Join-Path $DownloadsRoot $ArchiveName))
function Assert-ChildPath { param([string]$Root,[string]$Candidate); $prefix=$Root.TrimEnd('\')+'\'; if(-not $Candidate.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw "Unsafe path outside tool root: $Candidate"} }
Assert-ChildPath $ToolsRoot $DownloadsRoot; Assert-ChildPath $ToolsRoot $NodeHome; Assert-ChildPath $ToolsRoot $ArchivePath
New-Item -ItemType Directory -Path $DownloadsRoot -Force|Out-Null
$NodeExe=Join-Path $NodeHome 'node.exe'
if(-not(Test-Path -LiteralPath $NodeExe)){
	if(Test-Path -LiteralPath $NodeHome){Remove-Item -LiteralPath $NodeHome -Recurse -Force}
	if(-not(Test-Path -LiteralPath $ArchivePath)){Invoke-WebRequest -Uri $ArchiveUrl -OutFile $ArchivePath -UseBasicParsing}
	$actual=(Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
	if($actual-ne$ExpectedSha256){Remove-Item -LiteralPath $ArchivePath -Force;throw "Node archive checksum mismatch. Expected $ExpectedSha256; received $actual"}
	Expand-Archive -LiteralPath $ArchivePath -DestinationPath $ToolsRoot -Force
	Remove-Item -LiteralPath $ArchivePath -Force
}
$actualNode=(& $NodeExe --version).Trim(); if($LASTEXITCODE-ne0-or$actualNode-ne"v$NodeVersion"){throw "Unexpected project Node version: $actualNode"}
$NpmCmd=Join-Path $NodeHome 'npm.cmd'; $actualNpm=(& $NpmCmd --version).Trim()
if($actualNpm-ne$NpmVersion){Push-Location $ToolsRoot;try{& $NpmCmd install --global "npm@$NpmVersion" --prefix $NodeHome --no-audit --no-fund;if($LASTEXITCODE-ne0){throw "Failed to install npm@$NpmVersion"}}finally{Pop-Location};$actualNpm=(& $NpmCmd --version).Trim()}
if($actualNpm-ne$NpmVersion){throw "Unexpected project npm version: $actualNpm"}
[pscustomobject]@{NodeHome=$NodeHome;Node=$actualNode;Npm=$actualNpm;ArchiveSha256=$ExpectedSha256}|Format-List
