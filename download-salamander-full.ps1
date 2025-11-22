# Download Salamander Grand Piano V3 - BEST open-source piano
# Yamaha C5 Grand Piano, 48kHz/24bit, ~1.5 GB

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Salamander Grand Piano V3" -ForegroundColor Green
Write-Host "The BEST open-source piano sample library" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Details:" -ForegroundColor White
Write-Host "- Piano: Yamaha C5 Grand Piano" -ForegroundColor Gray
Write-Host "- Quality: 48kHz/24bit professional recording" -ForegroundColor Gray
Write-Host "- Samples: 16 velocity layers per note" -ForegroundColor Gray
Write-Host "- Size: ~1.5 GB (uncompressed)" -ForegroundColor Gray
Write-Host "- License: CC BY 3.0 (free)" -ForegroundColor Gray
Write-Host ""

# Download from official source
$downloadUrl = "https://archive.org/download/SalamanderGrandPianoV3/SalamanderGrandPianoV3.tar.xz"
$outputFile = "SalamanderGrandPianoV3.tar.xz"

Write-Host "Downloading from archive.org..." -ForegroundColor Yellow
Write-Host "This will take several minutes (1.5 GB)..." -ForegroundColor Yellow
Write-Host ""

try {
    # Start download with progress
    $ProgressPreference = 'Continue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $outputFile -TimeoutSec 3600
    
    Write-Host ""
    Write-Host "Download complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Extract the .tar.xz file (use 7-Zip)" -ForegroundColor White
    Write-Host "2. Find the WAV files in the extracted folder" -ForegroundColor White
    Write-Host "3. Convert to MP3 for web use (optional)" -ForegroundColor White
    Write-Host ""
    Write-Host "File saved: $outputFile" -ForegroundColor Cyan
}
catch {
    Write-Host ""
    Write-Host "Download failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Download manually from:" -ForegroundColor Yellow
    Write-Host "https://archive.org/details/SalamanderGrandPianoV3" -ForegroundColor Cyan
}
