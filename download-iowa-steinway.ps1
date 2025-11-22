# Download University of Iowa Steinway Model D
# Real Steinway Grand Piano - Public Domain

$baseUrl = "http://theremin.music.uiowa.edu/sound%20files/MIS/Pianos/steinway"
$outputDir = "piano-samples-steinway-iowa"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "Downloading University of Iowa Steinway Model D..." -ForegroundColor Green
Write-Host "Real Steinway Grand Piano recordings!" -ForegroundColor Cyan
Write-Host ""

# All 88 keys
$notes = @(
    @{name='A0'; file='Piano.mf.A0'},
    @{name='As0'; file='Piano.mf.Bb0'},
    @{name='B0'; file='Piano.mf.B0'},
    @{name='C1'; file='Piano.mf.C1'},
    @{name='Cs1'; file='Piano.mf.Db1'},
    @{name='D1'; file='Piano.mf.D1'},
    @{name='Ds1'; file='Piano.mf.Eb1'},
    @{name='E1'; file='Piano.mf.E1'},
    @{name='F1'; file='Piano.mf.F1'},
    @{name='Fs1'; file='Piano.mf.Gb1'},
    @{name='G1'; file='Piano.mf.G1'},
    @{name='Gs1'; file='Piano.mf.Ab1'},
    @{name='A1'; file='Piano.mf.A1'},
    @{name='As1'; file='Piano.mf.Bb1'},
    @{name='B1'; file='Piano.mf.B1'},
    @{name='C2'; file='Piano.mf.C2'},
    @{name='Cs2'; file='Piano.mf.Db2'},
    @{name='D2'; file='Piano.mf.D2'},
    @{name='Ds2'; file='Piano.mf.Eb2'},
    @{name='E2'; file='Piano.mf.E2'},
    @{name='F2'; file='Piano.mf.F2'},
    @{name='Fs2'; file='Piano.mf.Gb2'},
    @{name='G2'; file='Piano.mf.G2'},
    @{name='Gs2'; file='Piano.mf.Ab2'},
    @{name='A2'; file='Piano.mf.A2'},
    @{name='As2'; file='Piano.mf.Bb2'},
    @{name='B2'; file='Piano.mf.B2'},
    @{name='C3'; file='Piano.mf.C3'},
    @{name='Cs3'; file='Piano.mf.Db3'},
    @{name='D3'; file='Piano.mf.D3'},
    @{name='Ds3'; file='Piano.mf.Eb3'},
    @{name='E3'; file='Piano.mf.E3'},
    @{name='F3'; file='Piano.mf.F3'},
    @{name='Fs3'; file='Piano.mf.Gb3'},
    @{name='G3'; file='Piano.mf.G3'},
    @{name='Gs3'; file='Piano.mf.Ab3'},
    @{name='A3'; file='Piano.mf.A3'},
    @{name='As3'; file='Piano.mf.Bb3'},
    @{name='B3'; file='Piano.mf.B3'},
    @{name='C4'; file='Piano.mf.C4'},
    @{name='Cs4'; file='Piano.mf.Db4'},
    @{name='D4'; file='Piano.mf.D4'},
    @{name='Ds4'; file='Piano.mf.Eb4'},
    @{name='E4'; file='Piano.mf.E4'},
    @{name='F4'; file='Piano.mf.F4'},
    @{name='Fs4'; file='Piano.mf.Gb4'},
    @{name='G4'; file='Piano.mf.G4'},
    @{name='Gs4'; file='Piano.mf.Ab4'},
    @{name='A4'; file='Piano.mf.A4'},
    @{name='As4'; file='Piano.mf.Bb4'},
    @{name='B4'; file='Piano.mf.B4'},
    @{name='C5'; file='Piano.mf.C5'},
    @{name='Cs5'; file='Piano.mf.Db5'},
    @{name='D5'; file='Piano.mf.D5'},
    @{name='Ds5'; file='Piano.mf.Eb5'},
    @{name='E5'; file='Piano.mf.E5'},
    @{name='F5'; file='Piano.mf.F5'},
    @{name='Fs5'; file='Piano.mf.Gb5'},
    @{name='G5'; file='Piano.mf.G5'},
    @{name='Gs5'; file='Piano.mf.Ab5'},
    @{name='A5'; file='Piano.mf.A5'},
    @{name='As5'; file='Piano.mf.Bb5'},
    @{name='B5'; file='Piano.mf.B5'},
    @{name='C6'; file='Piano.mf.C6'},
    @{name='Cs6'; file='Piano.mf.Db6'},
    @{name='D6'; file='Piano.mf.D6'},
    @{name='Ds6'; file='Piano.mf.Eb6'},
    @{name='E6'; file='Piano.mf.E6'},
    @{name='F6'; file='Piano.mf.F6'},
    @{name='Fs6'; file='Piano.mf.Gb6'},
    @{name='G6'; file='Piano.mf.G6'},
    @{name='Gs6'; file='Piano.mf.Ab6'},
    @{name='A6'; file='Piano.mf.A6'},
    @{name='As6'; file='Piano.mf.Bb6'},
    @{name='B6'; file='Piano.mf.B6'},
    @{name='C7'; file='Piano.mf.C7'},
    @{name='Cs7'; file='Piano.mf.Db7'},
    @{name='D7'; file='Piano.mf.D7'},
    @{name='Ds7'; file='Piano.mf.Eb7'},
    @{name='E7'; file='Piano.mf.E7'},
    @{name='F7'; file='Piano.mf.F7'},
    @{name='Fs7'; file='Piano.mf.Gb7'},
    @{name='G7'; file='Piano.mf.G7'},
    @{name='Gs7'; file='Piano.mf.Ab7'},
    @{name='A7'; file='Piano.mf.A7'},
    @{name='As7'; file='Piano.mf.Bb7'},
    @{name='B7'; file='Piano.mf.B7'},
    @{name='C8'; file='Piano.mf.C8'}
)

$success = 0
$total = $notes.Count

foreach ($note in $notes) {
    $url = "$baseUrl/$($note.file).aiff"
    $output = "$outputDir\$($note.name).aiff"
    
    try {
        Write-Host "$($note.name) ..." -NoNewline
        Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop -TimeoutSec 15
        Write-Host " OK" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host " SKIP" -ForegroundColor Yellow
    }
    
    Start-Sleep -Milliseconds 150
}

Write-Host ""
Write-Host "Downloaded: $success / $total files" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files are in AIFF format (high quality)" -ForegroundColor Yellow
Write-Host "Need to convert to MP3 for web use" -ForegroundColor White
