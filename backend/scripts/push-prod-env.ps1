# Envoie les variables de production vers FastAPI Cloud.
# Usage (depuis backend/) : .\scripts\push-prod-env.ps1
# Lit backend/.env.production (non commite, copie de env.production.example avec les vraies valeurs).
$file = Join-Path $PSScriptRoot "..\.env.production"
if (-not (Test-Path $file)) { throw "Cree d'abord backend/.env.production a partir de env.production.example." }
$secrets = "SECRET_KEY", "ENCRYPTION_KEY", "FIREBASE_SERVICE_ACCOUNT_JSON", "RESEND_API_KEY", "GOOGLE_CLIENT_SECRET", "CLOUDINARY_API_SECRET", "CLOUDINARY_API_KEY"
foreach ($line in Get-Content $file) {
  if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
  $name, $value = $line -split '=', 2
  $name = $name.Trim()
  if (-not $value.Trim()) { Write-Host "ignore $name (vide)"; continue }
  $args = @("cloud", "env", "set", $name, "--value-stdin", "--no-redeploy")
  if ($secrets -contains $name) { $args += "--secret" }
  $value.Trim() | fastapi @args
}
Write-Host "Variables envoyees. Lance ensuite : fastapi cloud deploy"
