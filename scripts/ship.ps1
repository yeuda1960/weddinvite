# Ship Script for Wedding Invitation System
# Usage: .\scripts\ship.ps1 "commit message"
# Or just: .\scripts\ship.ps1 (will prompt for message)

param(
    [string]$Message = ""
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Wedding Invite - Ship to Production  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show current branch
$branch = git branch --show-current
Write-Host "Current branch: " -NoNewline
Write-Host $branch -ForegroundColor Yellow
Write-Host ""

# Check if we're on main
if ($branch -ne "main") {
    Write-Host "WARNING: You are NOT on the 'main' branch!" -ForegroundColor Red
    Write-Host "Vercel deploys from 'main'. Consider switching:" -ForegroundColor Yellow
    Write-Host "  git checkout main" -ForegroundColor Gray
    Write-Host "  git merge $branch" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Aborted." -ForegroundColor Red
        exit 1
    }
}

# Show git status
Write-Host "Git Status:" -ForegroundColor Cyan
Write-Host "----------------------------------------"
git status --short
Write-Host "----------------------------------------"
Write-Host ""

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if we need to push
    $unpushed = git log origin/$branch..$branch --oneline 2>$null
    if ([string]::IsNullOrWhiteSpace($unpushed)) {
        Write-Host "Everything is up to date with remote." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Unpushed commits:" -ForegroundColor Yellow
        git log origin/$branch..$branch --oneline
        Write-Host ""
        $push = Read-Host "Push these commits? (Y/n)"
        if ($push -eq "n" -or $push -eq "N") {
            Write-Host "Aborted." -ForegroundColor Red
            exit 1
        }
        git push origin $branch
        Write-Host ""
        Write-Host "Pushed to origin/$branch" -ForegroundColor Green
        Write-Host "Vercel will auto-deploy from GitHub." -ForegroundColor Cyan
        exit 0
    }
}

# Get commit message
if ([string]::IsNullOrWhiteSpace($Message)) {
    Write-Host "Enter commit message:" -ForegroundColor Cyan
    $Message = Read-Host
    if ([string]::IsNullOrWhiteSpace($Message)) {
        Write-Host "Commit message cannot be empty. Aborted." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Will commit with message:" -ForegroundColor Cyan
Write-Host "  $Message" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Proceed with commit and push? (Y/n)"
if ($confirm -eq "n" -or $confirm -eq "N") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

# Stage all changes
Write-Host ""
Write-Host "Staging changes..." -ForegroundColor Cyan
git add -A

# Commit
Write-Host "Committing..." -ForegroundColor Cyan
git commit -m "$Message"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit failed!" -ForegroundColor Red
    exit 1
}

# Push
Write-Host "Pushing to origin/$branch..." -ForegroundColor Cyan
git push origin $branch

if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Successfully shipped!                " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Vercel will automatically deploy from GitHub." -ForegroundColor Cyan
Write-Host "Check deployment: https://vercel.com/yeudas-projects/weddinvite" -ForegroundColor Gray
Write-Host ""
