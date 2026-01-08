# Smoke Test Script for API Endpoints
# Tests all API endpoints to verify deployment

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$ProdUrl = ""
)

$ErrorActionPreference = "Continue"

# Test results storage
$results = @()

function Test-Endpoint {
    param(
        [string]$BaseUrl,
        [string]$Endpoint,
        [string]$Description,
        [int]$ExpectedStatus = 200
    )
    
    $url = "$BaseUrl$Endpoint"
    Write-Host "Testing: $Description" -ForegroundColor Cyan
    Write-Host "  URL: $url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -ErrorAction Stop
        
        $statusCode = $response.StatusCode
        $headers = $response.Headers
        $body = $response.Content
        
        # Check for CDN-Cache-Control header
        $cdnCacheControl = $null
        if ($headers.ContainsKey('CDN-Cache-Control')) {
            $cdnCacheControl = $headers['CDN-Cache-Control']
        } elseif ($headers.ContainsKey('cdn-cache-control')) {
            $cdnCacheControl = $headers['cdn-cache-control']
        }
        
        $success = $statusCode -eq $ExpectedStatus
        
        $result = @{
            Endpoint = $Endpoint
            Description = $Description
            Status = $statusCode
            Expected = $ExpectedStatus
            Success = $success
            CDNCacheControl = $cdnCacheControl
            Error = $null
            BodyPreview = $null
        }
        
        if ($success) {
            Write-Host "  ✓ PASS (Status: $statusCode)" -ForegroundColor Green
            if ($cdnCacheControl) {
                Write-Host "  CDN-Cache-Control: $cdnCacheControl" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ✗ FAIL (Expected: $ExpectedStatus, Got: $statusCode)" -ForegroundColor Red
            $result.Error = "Status code mismatch"
            $result.BodyPreview = if ($body.Length -gt 200) { $body.Substring(0, 200) } else { $body }
            Write-Host "  Body preview: $($result.BodyPreview)" -ForegroundColor Red
        }
        
        return $result
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $body = ""
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $body = $reader.ReadToEnd()
        }
        catch {
            $body = $_.Exception.Message
        }
        
        $result = @{
            Endpoint = $Endpoint
            Description = $Description
            Status = $statusCode
            Expected = $ExpectedStatus
            Success = $false
            CDNCacheControl = $null
            Error = $_.Exception.Message
            BodyPreview = if ($body.Length -gt 200) { $body.Substring(0, 200) } else { $body }
        }
        
        Write-Host "  ✗ FAIL (Status: $statusCode)" -ForegroundColor Red
        Write-Host "  Error: $($result.Error)" -ForegroundColor Red
        Write-Host "  Body preview: $($result.BodyPreview)" -ForegroundColor Red
        
        return $result
    }
}

# Test endpoints
$endpoints = @(
    @{ Endpoint = "/api/health"; Description = "Health Check"; ExpectedStatus = 200 },
    @{ Endpoint = "/api/search?q=1183441"; Description = "Search (TASE)"; ExpectedStatus = 200 },
    @{ Endpoint = "/api/quote?ids=yahoo:AAPL"; Description = "Quote (AAPL)"; ExpectedStatus = 200 },
    @{ Endpoint = "/api/history?id=yahoo:AAPL&range=1mo&interval=1d"; Description = "History (AAPL)"; ExpectedStatus = 200 }
)

# Test local URL
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "Testing Local Environment" -ForegroundColor Magenta
Write-Host "Base URL: $BaseUrl" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

foreach ($ep in $endpoints) {
    $result = Test-Endpoint -BaseUrl $BaseUrl -Endpoint $ep.Endpoint -Description $ep.Description -ExpectedStatus $ep.ExpectedStatus
    $result.BaseUrl = $BaseUrl
    $results += $result
    Write-Host ""
}

# Test production URL if provided
if ($ProdUrl -ne "") {
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host "Testing Production Environment" -ForegroundColor Magenta
    Write-Host "Base URL: $ProdUrl" -ForegroundColor Magenta
    Write-Host "========================================`n" -ForegroundColor Magenta
    
    foreach ($ep in $endpoints) {
        $result = Test-Endpoint -BaseUrl $ProdUrl -Endpoint $ep.Endpoint -Description $ep.Description -ExpectedStatus $ep.ExpectedStatus
        $result.BaseUrl = $ProdUrl
        $results += $result
        Write-Host ""
    }
}

# Print summary table
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "Summary" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

$table = $results | ForEach-Object {
    [PSCustomObject]@{
        BaseUrl = $_.BaseUrl
        Endpoint = $_.Endpoint
        Description = $_.Description
        Status = $_.Status
        Expected = $_.Expected
        Result = if ($_.Success) { "PASS" } else { "FAIL" }
        CDN_Cache = if ($_.CDNCacheControl) { $_.CDNCacheControl } else { "-" }
    }
}

$table | Format-Table -AutoSize

# Count failures
$failures = ($results | Where-Object { -not $_.Success }).Count
$total = $results.Count
$passed = $total - $failures

Write-Host "`nTotal Tests: $total" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failures" -ForegroundColor $(if ($failures -eq 0) { "Green" } else { "Red" })

# Exit with error code if any tests failed
if ($failures -gt 0) {
    Write-Host "`n❌ Some tests failed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✓ All tests passed!" -ForegroundColor Green
    exit 0
}
