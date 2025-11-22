# Steinway 音色转换脚本 (PowerShell 版本)
# 使用 Windows Media Foundation 转换 WAV -> MP3

$SourceDir = "3832_Steinway_JonMeyer_DecentSampler/Steinway Grand  (DS)/Samples"
$OutputDir = "piano-samples-steinway-optimized"

Write-Host "🎹 Steinway 音色转换工具 (PowerShell 版)" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Gray

# 检查源目录
if (-not (Test-Path $SourceDir)) {
    Write-Host "❌ 错误: 源目录不存在: $SourceDir" -ForegroundColor Red
    exit
}

# 创建输出目录
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}
Write-Host "✅ 输出目录: $OutputDir" -ForegroundColor Green

# 获取所有 WAV 文件
$wavFiles = Get-ChildItem -Path $SourceDir -Filter "*.wav" | Sort-Object Name
$totalFiles = $wavFiles.Count

if ($totalFiles -eq 0) {
    Write-Host "❌ 错误: 未找到 WAV 文件" -ForegroundColor Red
    exit
}

Write-Host "`n开始转换 $totalFiles 个文件..." -ForegroundColor Yellow
Write-Host ("─" * 50) -ForegroundColor Gray

# 加载 Windows Media Foundation
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AudioConverter {
    [DllImport("winmm.dll")]
    public static extern int mciSendString(string command, System.Text.StringBuilder returnValue, int returnLength, IntPtr hwndCallback);
}
"@

# 统计
$converted = 0
$failed = 0
$totalSizeBefore = 0
$totalSizeAfter = 0

# 转换函数（使用 NAudio 或直接复制）
function Convert-WavToMp3 {
    param(
        [string]$InputPath,
        [string]$OutputPath
    )
    
    try {
        # 简单方案：直接复制 WAV 文件（保持原始质量）
        # 如果需要压缩，需要安装 NAudio 或 ffmpeg
        Copy-Item -Path $InputPath -Destination $OutputPath -Force
        return $true
    }
    catch {
        return $false
    }
}

# 转换所有文件
$i = 0
foreach ($file in $wavFiles) {
    $i++
    $inputPath = $file.FullName
    $outputPath = Join-Path $OutputDir ($file.Name -replace "\.wav$", ".wav")
    
    # 获取原始大小
    $sizeBefore = (Get-Item $inputPath).Length / 1MB
    $totalSizeBefore += $sizeBefore
    
    # 转换
    Write-Host "🔄 [$i/$totalFiles] $($file.Name)..." -NoNewline -ForegroundColor White
    
    if (Convert-WavToMp3 -InputPath $inputPath -OutputPath $outputPath) {
        $sizeAfter = (Get-Item $outputPath).Length / 1MB
        $totalSizeAfter += $sizeAfter
        $compression = [math]::Round((1 - $sizeAfter / $sizeBefore) * 100, 0)
        Write-Host " ✅ $([math]::Round($sizeBefore, 1))MB -> $([math]::Round($sizeAfter, 1))MB" -ForegroundColor Green
        $converted++
    }
    else {
        Write-Host " ❌ 失败" -ForegroundColor Red
        $failed++
    }
}

# 总结
Write-Host "`n$("=" * 50)" -ForegroundColor Gray
Write-Host "📊 转换完成!" -ForegroundColor Cyan
Write-Host "✅ 成功: $converted 个文件" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "❌ 失败: $failed 个文件" -ForegroundColor Red
}
Write-Host "💾 原始大小: $([math]::Round($totalSizeBefore, 1)) MB" -ForegroundColor Yellow
Write-Host "💾 转换后: $([math]::Round($totalSizeAfter, 1)) MB" -ForegroundColor Yellow

Write-Host "`n⚠️  注意: PowerShell 版本直接复制 WAV 文件（未压缩）" -ForegroundColor Yellow
Write-Host "如需压缩，请安装 ffmpeg 并使用 Python 脚本" -ForegroundColor Yellow
Write-Host "`n📁 输出目录: $OutputDir" -ForegroundColor Cyan
