# PowerShell script to resize and generate Android icons using high quality System.Drawing
[void][System.Reflection.Assembly]::LoadWithPartialName("System.Drawing")

$sourcePath = "C:\Users\Admin\.gemini\antigravity-ide\brain\0272f714-c8b8-40d0-a78a-7707f4ca1864\media__1779952030148.png"
if (-not (Test-Path $sourcePath)) {
    # Try local assets path
    $sourcePath = "D:\Old PC\Billing\Final\easybmt_project\assets\icon.png"
}

Write-Output "Using source icon: $sourcePath"

$resDir = "D:\Old PC\Billing\Final\easybmt_project\android\app\src\main\res"

# Define configurations for each density folder
$configs = @(
    @{ Path = "mipmap-ldpi";   LegacySize = 36;  AdaptiveSize = 81 },
    @{ Path = "mipmap-mdpi";   LegacySize = 48;  AdaptiveSize = 108 },
    @{ Path = "mipmap-hdpi";   LegacySize = 72;  AdaptiveSize = 162 },
    @{ Path = "mipmap-xhdpi";  LegacySize = 96;  AdaptiveSize = 216 },
    @{ Path = "mipmap-xxhdpi"; LegacySize = 144; AdaptiveSize = 324 },
    @{ Path = "mipmap-xxxhdpi";LegacySize = 192; AdaptiveSize = 432 }
)

function Resize-Image {
    param (
        [string]$SrcFile,
        [string]$DstFile,
        [int]$Width,
        [int]$Height
    )
    
    $srcImg = [System.Drawing.Image]::FromFile($SrcFile)
    $dstImg = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($dstImg)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Draw original image fully fitting the destination bounds
    $g.DrawImage($srcImg, 0, 0, $Width, $Height)
    
    $g.Dispose()
    $srcImg.Dispose()
    
    # Force overwrite if exists
    if (Test-Path $DstFile) {
        Remove-Item $DstFile -Force
    }
    
    $dstImg.Save($DstFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $dstImg.Dispose()
    Write-Output "Generated: $DstFile ($Width x $Height)"
}

function Create-Solid-Color-Image {
    param (
        [string]$DstFile,
        [int]$Width,
        [int]$Height,
        [System.Drawing.Color]$Color
    )
    
    $dstImg = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($dstImg)
    
    $brush = New-Object System.Drawing.SolidBrush($Color)
    $g.FillRectangle($brush, 0, 0, $Width, $Height)
    $brush.Dispose()
    $g.Dispose()
    
    if (Test-Path $DstFile) {
        Remove-Item $DstFile -Force
    }
    
    $dstImg.Save($DstFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $dstImg.Dispose()
    Write-Output "Generated solid color background: $DstFile ($Width x $Height)"
}

# Run the resizing
foreach ($config in $configs) {
    $targetFolder = Join-Path $resDir $config.Path
    if (-not (Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
    }
    
    # 1. Legacy Launcher Icon (ic_launcher.png)
    $dstLegacy = Join-Path $targetFolder "ic_launcher.png"
    Resize-Image -SrcFile $sourcePath -DstFile $dstLegacy -Width $config.LegacySize -Height $config.LegacySize
    
    # 2. Legacy Round Launcher Icon (ic_launcher_round.png)
    $dstRound = Join-Path $targetFolder "ic_launcher_round.png"
    Resize-Image -SrcFile $sourcePath -DstFile $dstRound -Width $config.LegacySize -Height $config.LegacySize
    
    # 3. Adaptive Foreground Icon (ic_launcher_foreground.png)
    # The foreground should have the user's icon centered. 
    # Since the user's icon is a complete brand square, let's use the image itself.
    $dstForeground = Join-Path $targetFolder "ic_launcher_foreground.png"
    Resize-Image -SrcFile $sourcePath -DstFile $dstForeground -Width $config.AdaptiveSize -Height $config.AdaptiveSize
    
    # 4. Adaptive Background Icon (ic_launcher_background.png)
    # Let's make it a solid white background, or solid orange.
    # The orange color in the logo is approximately hex #f37021 (R:243, G:112, B:33).
    # Let's write a solid orange background or a solid white background. 
    # White background matches the white outer background of the user's image.
    $dstBackground = Join-Path $targetFolder "ic_launcher_background.png"
    Create-Solid-Color-Image -DstFile $dstBackground -Width $config.AdaptiveSize -Height $config.AdaptiveSize -Color ([System.Drawing.Color]::White)
}

Write-Output "All icons successfully generated in Android res directories!"
