# Git для schedule-3d (обхід зламаної/заблокованої папки .git у проєкті)
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$env:GIT_DIR = 'C:\temp\schedule3d-git'
$env:GIT_WORK_TREE = $ProjectRoot

if (-not (Test-Path $env:GIT_DIR)) {
  Write-Error "Git-сховище не знайдено: $env:GIT_DIR. Запустіть scripts/fix-git.ps1"
  exit 1
}

Set-Location $ProjectRoot
