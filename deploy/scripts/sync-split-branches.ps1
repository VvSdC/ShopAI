# Regenerate backend + frontend split branches from main
$ErrorActionPreference = "Stop"
Set-Location (git rev-parse --show-toplevel)

if ((git branch --show-current) -ne "main") {
  git checkout main
}

$backendTemp = "$env:TEMP\shopai-backend-split"
$frontendTemp = "$env:TEMP\shopai-frontend-split"
$repoRoot = Get-Location
Remove-Item -Recurse -Force $backendTemp,$frontendTemp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $backendTemp,$frontendTemp | Out-Null
robocopy "$repoRoot\Backend" $backendTemp /E /XD node_modules /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy "$repoRoot\Frontend" $frontendTemp /E /XD node_modules build /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

function Update-SplitBranch {
  param(
    [string]$Name,
    [string]$SourceTemp,
    [string]$ExtraFileName,
    [string]$ExtraFileSource
  )

  $branchRef = "refs/heads/$Name"
  git rev-parse --verify $branchRef 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { git branch -D $Name | Out-Null }

  git checkout --orphan $Name
  if ((git branch --show-current) -ne $Name) {
    throw "Failed to create orphan branch '$Name' (current: $(git branch --show-current))"
  }
  git reset

  Get-ChildItem -Force -Path . | Where-Object { $_.Name -ne '.git' } | ForEach-Object {
    if ($_.PSIsContainer) { cmd /c "rd /s /q `"$($_.FullName)`"" 2>$null }
    else { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
  }

  robocopy $SourceTemp . /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  if ($ExtraFileSource -and (Test-Path $ExtraFileSource)) {
    Copy-Item $ExtraFileSource $ExtraFileName -Force
  }

  if ((git branch --show-current) -eq "main") {
    throw "Refusing to commit deploy tree on main"
  }

  git add -A
  $msg = "$Name-only deploy branch (app at repository root)"
  $msg | Set-Content -Path .git\msg-split.txt -Encoding ascii
  $tree = git write-tree
  $new = git commit-tree $tree -F .git\msg-split.txt
  git reset --hard $new
}

$renderTemplate = Join-Path $repoRoot "deploy\templates\render.backend-root.yaml"
$netlifyTemplate = Join-Path $repoRoot "deploy\templates\netlify.frontend-root.toml"

Update-SplitBranch backend $backendTemp "render.yaml" $renderTemplate
git checkout main
Update-SplitBranch frontend $frontendTemp "netlify.toml" $netlifyTemplate
git checkout main
Write-Host "Split branches updated. Push with: git push --force-with-lease origin backend frontend"
