<#
.SYNOPSIS
  Skapar ett självsignerat HTTPS-certifikat för VR-läget (WebXR kräver https).
.DESCRIPTION
  Skriver cert/key.pem och cert/cert.pem i projektroten. server.js hittar dem
  automatiskt och lyssnar då även på https://<IP>:8443. Certifikatet gäller för
  datorns alla LAN-adresser plus localhost. Kör en gång; kör om vid nytt IP.
  Loggar till logs/devcert_log.txt.
#>
[CmdletBinding()]
param(
  [int]$ValidYears = 5
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
$certDir = Join-Path $root 'cert'
$logFile = Join-Path $root 'logs\devcert_log.txt'
New-Item -ItemType Directory -Force -Path $certDir, (Split-Path $logFile) | Out-Null

function Write-Log([string]$msg) {
  $line = "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $msg
  Write-Host $line
  Add-Content -Path $logFile -Value $line -Encoding utf8
}

$ips = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -ExpandProperty IPAddress -Unique
$dns = @('localhost') + $ips
Write-Log "Skapar certifikat för: $($dns -join ', ')"

$cert = New-SelfSignedCertificate `
  -Subject 'CN=Regnbågsgaloppen dev' `
  -DnsName $dns `
  -KeyAlgorithm RSA -KeyLength 2048 `
  -KeyExportPolicy Exportable `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -NotAfter (Get-Date).AddYears($ValidYears) `
  -KeyUsage DigitalSignature, KeyEncipherment `
  -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.1')

# PEM-export (kräver .NET 7+, vilket PowerShell 7.3+ har)
$certPem = $cert.ExportCertificatePem()
$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
$keyPem = $rsa.ExportPkcs8PrivateKeyPem()

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $certDir 'cert.pem'), $certPem + "`n", $utf8)
[System.IO.File]::WriteAllText((Join-Path $certDir 'key.pem'), $keyPem + "`n", $utf8)

# Städa bort från certifikatlagret – filerna räcker för servern.
Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force

Write-Log "Klart: $certDir\cert.pem och key.pem (tumavtryck $($cert.Thumbprint))"
Write-Host ''
Write-Host 'Starta spelet och öppna i Quest-webbläsaren:' -ForegroundColor Cyan
foreach ($ip in $ips) { Write-Host "  https://${ip}:8443" -ForegroundColor Green }
Write-Host 'Godkänn varningen om certifikatet (Avancerat → Fortsätt) och tryck på VR-knappen.'
