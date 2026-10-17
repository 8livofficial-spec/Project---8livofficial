param(
    [Parameter(Position = 0)]
    [string]$StagingUrl
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$linuxRoot = (wsl -d Ubuntu -- wslpath -a $repoRoot).Trim()

if (-not $linuxRoot) {
    throw "Could not map the repository path into Ubuntu WSL."
}

$arguments = @("-d", "Ubuntu", "--", "bash", "$linuxRoot/scripts/run-strix.sh")
if ($StagingUrl) {
    $arguments += $StagingUrl
}

& wsl @arguments
exit $LASTEXITCODE
