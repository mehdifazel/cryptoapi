# Commit and push to mehdifazel/cryptoapi (main branch)
# Run in PowerShell from project folder: .\git-push-to-github.ps1
# When asked for password, use a Personal Access Token (PAT), not your GitHub password:
#   GitHub -> Settings -> Developer settings -> Personal access tokens -> Generate new token

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

git config user.email "mehdifazel75@gmail.com"
git config user.name "mehdifazel"

if (-not (Test-Path .git)) { git init }
if (Test-Path .git\index.lock) { Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue }

git add -A
git commit -m "Initial commit: Crypto API - Nobitex, Wallex, Ramzinex live prices"
git branch -M main

git remote remove origin 2>$null
git remote add origin https://github.com/mehdifazel/cryptoapi.git

Write-Host "Pushing to main (you may be asked for username/password; use PAT as password)..."
git push -u origin main --force

Write-Host "Done. Repo: mehdifazel/cryptoapi, branch: main"
