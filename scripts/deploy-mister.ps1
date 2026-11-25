param(
    [string]$MisterIp = $env:MISTER_IP,
    [switch]$LaunchBox
)

$ErrorActionPreference = 'Stop'
if (-not $MisterIp) {
    $MisterIp = '192.168.0.118'
}

$target = "root@$MisterIp"
$archiveName = "mister-remote-$([Guid]::NewGuid().ToString('N')).tar.gz"
$archive = Join-Path ([IO.Path]::GetTempPath()) $archiveName
$remoteArchive = "/media/fat/$archiveName"

function Assert-Success($operation) {
    if ($LASTEXITCODE -ne 0) {
        throw "$operation failed (exit code $LASTEXITCODE)."
    }
}

Push-Location (Join-Path $PSScriptRoot '..')
try {
    if ($LaunchBox) {
        $remoteLibrary = '/media/fat/remote/launchbox'
        & tar.exe -czf $archive -C public launchbox
        Assert-Success 'LaunchBox archive creation'
        & scp.exe -O $archive "${target}:$remoteArchive"
        Assert-Success 'LaunchBox upload'
        & ssh.exe $target "trap 'rm -f $remoteArchive' EXIT; mkdir -p $remoteLibrary && tar -xzf $remoteArchive -C /media/fat/remote"
        Assert-Success 'LaunchBox installation'
        Write-Host "LaunchBox ready at http://${MisterIp}:8183/launchbox/nes.json"
        return
    }

    Get-Command ssh.exe, scp.exe, tar.exe, yarn.cmd | Out-Null

    Write-Host "==> Checking SSH and Python on MiSTer ($MisterIp)..."
    & ssh.exe -o ConnectTimeout=5 $target 'command -v python3 || command -v python'
    Assert-Success 'MiSTer connection and Python check'

    Write-Host '==> Bumping minor version and building...'
    & yarn.cmd version --minor --no-git-tag-version
    Assert-Success 'Version bump'
    & yarn.cmd build
    Assert-Success 'Build'

    Write-Host '==> Packing and uploading...'
    & tar.exe --exclude './launchbox' -czf $archive -C dist . -C (Get-Location).Path scripts/spa-server.py
    Assert-Success 'Archive creation'
    & scp.exe -O $archive "${target}:$remoteArchive"
    Assert-Success 'Upload'

    Write-Host '==> Installing and restarting the HTTP server...'
    $install = @'
set -eu
archive=$1
trap 'rm -f "$archive"' EXIT
remote_dir=/media/fat/remote
port=8183
startup=/media/fat/linux/user-startup.sh
marker='# mister-remote'
python_bin=$(command -v python3 || command -v python)

mkdir -p "$remote_dir"
for entry in "$remote_dir"/*; do
    [ "$entry" = "$remote_dir/launchbox" ] || rm -rf "$entry"
done
tar -xzf "$archive" -C "$remote_dir"
mv "$remote_dir/scripts/spa-server.py" "$remote_dir/server.py"
rmdir "$remote_dir/scripts"

"$python_bin" - "$remote_dir/server.py" "$port" <<'PY'
import os
import signal
import sys
import time

server, port = (arg.encode() for arg in sys.argv[1:])
for pid in os.listdir('/proc'):
    if not pid.isdigit():
        continue
    try:
        with open('/proc/' + pid + '/cmdline', 'rb') as process:
            args = process.read().split(b'\0')
        if len(args) > 2 and args[1:3] == [server, port]:
            os.kill(int(pid), signal.SIGTERM)
    except (OSError, ValueError):
        pass
time.sleep(0.5)
PY
nohup "$python_bin" "$remote_dir/server.py" "$port" "$remote_dir" </dev/null >/dev/null 2>&1 &

if ! grep -Fq "$marker" "$startup" 2>/dev/null; then
    printf '\n%s\n' "$marker" >> "$startup"
    printf '[ -e %s/index.html ] && nohup %s %s/server.py %s %s </dev/null >/dev/null 2>&1 &\n' \
        "$remote_dir" "$python_bin" "$remote_dir" "$port" "$remote_dir" >> "$startup"
fi
'@
    # OpenSSH on Windows passes piped PowerShell text with CRLF line endings.
    $install -split '\r?\n' | & ssh.exe $target "tr -d '\r' | sh -s -- $remoteArchive"
    Assert-Success 'Remote installation'

    Write-Host "Ready! Open http://${MisterIp}:8183"
}
finally {
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
    Pop-Location
}
