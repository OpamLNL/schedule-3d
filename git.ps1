param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
. "$PSScriptRoot\scripts\git-env.ps1"
& git @Args
exit $LASTEXITCODE
