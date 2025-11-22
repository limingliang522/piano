# Download Bright Acoustic Piano (closest to Steinway sound)
$baseUrl = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/bright_acoustic_piano-mp3'
$outputDir = "piano-samples-bright"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "Downloading Bright Acoustic Piano..." -ForegroundColor Green
Write-Host "Brighter, clearer tone - similar to Steinway!" -ForegroundColor Cyan
Write-Host ""

$notes = @(
    'A0', 'B0',
    'C1', 'D1', 'E1', 'F1', 'G1', 'A1', 'B1',
    'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
    'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
    'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
    'C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6',
    'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7',
    'C8'
)

$success = 0
foreach ($note in $notes) {
    try {
        Write-Host "$note ..." -NoNewline
        Invoke-WebRequest -Uri "$baseUrl/$note.mp3" -OutFile "$outputDir\$note.mp3" -ErrorAction Stop -TimeoutSec 10
        Write-Host " OK" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host " FAIL" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 100
}

Write-Host ""
if ($success -gt 40) {
    Write-Host "Replacing with bright piano..." -ForegroundColor Yellow
    Remove-Item piano-samples -Recurse -Force
    Rename-Item piano-samples-bright piano-samples
    Write-Host "Done! Bright piano installed!" -ForegroundColor Green
} else {
    Write-Host "Download failed: only $success files" -ForegroundColor Red
}
