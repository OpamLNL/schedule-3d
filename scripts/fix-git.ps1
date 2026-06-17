# Fix Git for schedule-3d (IntelliJ IDEA / WebStorm)
# CLOSE the IDE completely before running!

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$GitStore = 'C:\temp\schedule3d-git'
$GitTarget = Join-Path $ProjectRoot '.git'

Write-Host "Project: $ProjectRoot"
Write-Host "Git store: $GitStore"

if (-not (Test-Path $GitStore)) {
  Write-Error "Git store not found: $GitStore"
}

if (Test-Path $GitTarget) {
  Write-Host 'Removing broken .git ...'
  Remove-Item -Recurse -Force $GitTarget
}

Write-Host 'Copying git history into .git ...'
Copy-Item -Path $GitStore -Destination $GitTarget -Recurse -Force

Write-Host ''
Write-Host 'Done:'
git -C $ProjectRoot status
Write-Host ''
git -C $ProjectRoot log --oneline -5
Write-Host ''
Write-Host 'Open IntelliJ again. Branch should be: main'
Write-Host 'Push:'
Write-Host '  git remote add origin https://github.com/USER/REPO.git'
Write-Host '  git push -u origin main'
