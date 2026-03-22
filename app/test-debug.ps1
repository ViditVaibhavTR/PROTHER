Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinMM {
    [DllImport("winmm.dll", CharSet = CharSet.Auto)]
    public static extern int mciSendString(string command, StringBuilder returnValue, int returnLength, IntPtr hwndCallback);
}
"@

$tmpFile = [System.IO.Path]::Combine($env:TEMP, "prother_debug.wav")
$sb = New-Object System.Text.StringBuilder 256

Write-Output "Recording 3 seconds..."
[WinMM]::mciSendString("open new Type waveaudio Alias dbg_rec", $sb, 256, [IntPtr]::Zero) | Out-Null
[WinMM]::mciSendString("record dbg_rec", $sb, 256, [IntPtr]::Zero) | Out-Null
Start-Sleep -Seconds 3
[WinMM]::mciSendString("stop dbg_rec", $null, 0, [IntPtr]::Zero) | Out-Null
[WinMM]::mciSendString("save dbg_rec `"$tmpFile`"", $null, 0, [IntPtr]::Zero) | Out-Null
[WinMM]::mciSendString("close dbg_rec", $null, 0, [IntPtr]::Zero) | Out-Null

$size = (Get-Item $tmpFile).Length
Write-Output "WAV size: $size bytes"
Write-Output "File: $tmpFile"
