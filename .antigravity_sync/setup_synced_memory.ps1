# setup_synced_memory.ps1
# Run this script to sync Antigravity/Gemini memory across PCs via Google Drive.

$LocalGemini = "C:\Users\$env:USERNAME\.gemini"
$DriveGemini = "E:\Drive\Google Antigravity\Government Exams\.antigravity_sync\.gemini"

Write-Host "--- Antigravity Memory Sync Setup ---" -ForegroundColor Cyan

# 1. Check if the app is likely running
$Process = Get-Process -Name "*antigravity*" -ErrorAction SilentlyContinue
if ($Process) {
    Write-Warning "Antigravity/Gemini app seems to be running. Please CLOSE it first and then press any key to continue..."
    Read-Host
}

# 2. Logic for FIRST PC (the one with data)
if (Test-Path $LocalGemini -PathType Container) {
    if (!(Test-Path $DriveGemini)) {
        Write-Host "[1/2] Moving local memory to Google Drive..." -ForegroundColor Yellow
        Move-Item -Path $LocalGemini -Destination $DriveGemini
        Write-Host "✅ Data moved to: $DriveGemini" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ Memory already exists in Google Drive. Skipping move." -ForegroundColor Gray
    }

    # Create Junction
    Write-Host "[2/2] Linking C: drive to Google Drive..." -ForegroundColor Yellow
    if (Test-Path $LocalGemini) { 
        # If the folder still exists (move failed or it was recreated), remove it
        Remove-Item -Path $LocalGemini -Recurse -Force 
    }
    
    # Needs Admin for mklink, but New-Item -ItemType Junction usually doesn't for user folders
    New-Item -ItemType Junction -Path $LocalGemini -Target $DriveGemini
    Write-Host "✅ Sync Connection established!" -ForegroundColor Green
} 
else {
    # 3. Logic for SECOND PC (the one without data yet)
    Write-Host "ℹ️ Local .gemini folder not found. Setting up link to Drive..." -ForegroundColor Yellow
    if (Test-Path $DriveGemini) {
        New-Item -ItemType Junction -Path $LocalGemini -Target $DriveGemini
        Write-Host "✅ Junction created. Memory is now synced from Drive!" -ForegroundColor Green
    } else {
        Write-Error "Could not find .gemini in Drive at $DriveGemini. Make sure GDrive has finished syncing."
    }
}

Write-Host "`nAll set! You can now restart the app." -ForegroundColor Cyan
