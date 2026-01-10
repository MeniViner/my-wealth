# Smoke Test Script for API Endpoints
# Tests all API endpoints to verify deployment

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$ProdUrl = "https://my-wealth-orcin.vercel.app"
)

$ErrorActionPreference = "Continue"

# Test results storage
$results = @()

function Test-Endpoint {
    param(
        [string]$BaseUrl,
        [string]$Endpoint,
        [string]$Description,
        [int]$ExpectedStatus = 200,
        [scriptblock]$Validation = $null,
        [string]$Method = "GET"
    )
    
    $url = "$BaseUrl$Endpoint"
    Write-Host "Testing: $Description" -ForegroundColor Cyan
    Write-Host "  URL: $url ($Method)" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method $Method -UseBasicParsing -ErrorAction Stop
        
        $statusCode = $response.StatusCode
        $headers = $response.Headers
        $body = $response.Content
        
        # Parse JSON if possible
        $jsonData = $null
        try {
            $jsonData = $body | ConvertFrom-Json
        } catch {
            # Not JSON, ignore
        }
        
        # Check for CDN-Cache-Control header
        $cdnCacheControl = $null
        if ($headers.ContainsKey('CDN-Cache-Control')) {
            $cdnCacheControl = $headers['CDN-Cache-Control']
        } elseif ($headers.ContainsKey('cdn-cache-control')) {
            $cdnCacheControl = $headers['cdn-cache-control']
        }
        
        $success = $statusCode -eq $ExpectedStatus
        $validationError = $null
        
        # Run custom validation if provided
        if ($success -and $Validation -ne $null) {
            try {
                $validationResult = & $Validation $jsonData $body
                if (-not $validationResult) {
                    $success = $false
                    $validationError = "Validation failed"
                }
            } catch {
                $success = $false
                $validationError = "Validation error: $($_.Exception.Message)"
            }
        }
        
        $result = @{
            Endpoint = $Endpoint
            Description = $Description
            Status = $statusCode
            Expected = $ExpectedStatus
            Success = $success
            CDNCacheControl = $cdnCacheControl
            Error = if ($validationError) { $validationError } else { $null }
            BodyPreview = $null
        }
        
        if ($success) {
            Write-Host "  ✓ PASS (Status: $statusCode)" -ForegroundColor Green
            if ($cdnCacheControl) {
                Write-Host "  CDN-Cache-Control: $cdnCacheControl" -ForegroundColor Yellow
            }
            if ($Validation -ne $null) {
                Write-Host "  Validation: ✓" -ForegroundColor Green
            }
        } else {
            Write-Host "  ✗ FAIL" -ForegroundColor Red
            if ($statusCode -ne $ExpectedStatus) {
                Write-Host "    Status: Expected $ExpectedStatus, Got $statusCode" -ForegroundColor Red
            }
            if ($validationError) {
                Write-Host "    Validation: $validationError" -ForegroundColor Red
            }
            $result.BodyPreview = if ($body.Length -gt 200) { $body.Substring(0, 200) } else { $body }
            Write-Host "  Body preview: $($result.BodyPreview)" -ForegroundColor Red
        }
        
        return $result
    }
    catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        $body = ""
        
        try {
            if ($_.Exception.Response) {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $body = $reader.ReadToEnd()
            } else {
                $body = $_.Exception.Message
            }
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

# Test endpoints with validations
$endpoints = @(
    @{ 
        Endpoint = "/api/health"; 
        Description = "Health Check"; 
        ExpectedStatus = 200;
        Validation = $null
    },
    @{ 
        Endpoint = "/api/search?q=1183441"; 
        Description = "Search (TASE 1183441)"; 
        ExpectedStatus = 200;
        Validation = {
            param($json, $body)
            if (-not $json) { return $false }
            $hasTase = $false
            if ($json -is [Array]) {
                $hasTase = ($json | Where-Object { $_.id -like "tase:1183441" }) -ne $null
            } elseif ($json.id -like "tase:1183441") {
                $hasTase = $true
            }
            if (-not $hasTase) {
                Write-Host "    ✗ Response does not include tase:1183441" -ForegroundColor Red
            }
            return $hasTase
        }
    },
    @{ 
        Endpoint = "/api/quote?ids=yahoo:AAPL"; 
        Description = "Quote (yahoo:AAPL)"; 
        ExpectedStatus = 200;
        Validation = {
            param($json, $body)
            if (-not $json) { return $false }
            $quote = if ($json -is [Array]) { $json[0] } else { $json }
            if (-not $quote) { return $false }
            if ($quote.error) {
                Write-Host "    ✗ Quote has error: $($quote.error)" -ForegroundColor Red
                return $false
            }
            if (-not $quote.price -or $quote.price -eq 0) {
                Write-Host "    ✗ Quote has no valid price" -ForegroundColor Red
                return $false
            }
            Write-Host "    ✓ Price: $($quote.price) $($quote.currency)" -ForegroundColor Green
            return $true
        }
    },
    @{ 
        Endpoint = "/api/history?id=yahoo:AAPL&range=1mo&interval=1d"; 
        Description = "History (yahoo:AAPL)"; 
        ExpectedStatus = 200;
        Validation = {
            param($json, $body)
            if (-not $json) { return $false }
            if (-not $json.points -or $json.points.Count -eq 0) {
                Write-Host "    ✗ History has no points" -ForegroundColor Red
                return $false
            }
            Write-Host "    ✓ Points: $($json.points.Count)" -ForegroundColor Green
            return $true
        }
    },
    @{ 
        Endpoint = "/api/quote?ids=tase:1183441"; 
        Description = "Quote (tase:1183441)"; 
        ExpectedStatus = 200;
        Validation = {
            param($json, $body)
            if (-not $json) { return $false }
            $quote = if ($json -is [Array]) { $json[0] } else { $json }
            if (-not $quote) { return $false }
            if ($quote.error) {
                Write-Host "    ✗ Quote has error: $($quote.error)" -ForegroundColor Red
                return $false
            }
            if (-not $quote.price -or $quote.price -eq 0) {
                Write-Host "    ✗ Quote has no valid price" -ForegroundColor Red
                return $false
            }
            Write-Host "    ✓ Price: $($quote.price) $($quote.currency)" -ForegroundColor Green
            return $true
        }
    },
    @{ 
        Endpoint = "/api/history?id=tase:1183441&range=1mo&interval=1d"; 
        Description = "History (tase:1183441)"; 
        ExpectedStatus = 200;
        Validation = {
            param($json, $body)
            if (-not $json) { return $false }
            if (-not $json.points -or $json.points.Count -eq 0) {
                Write-Host "    ✗ History has no points" -ForegroundColor Red
                return $false
            }
            Write-Host "    ✓ Points: $($json.points.Count)" -ForegroundColor Green
            return $true
        }
    },
    @{ 
        Endpoint = "/api/health"; 
        Description = "HEAD Health Check"; 
        ExpectedStatus = 200;
        Method = "HEAD";
        Validation = $null
    },
    @{ 
        Endpoint = "/api/quote?ids=yahoo:AAPL"; 
        Description = "HEAD Quote (yahoo:AAPL)"; 
        ExpectedStatus = 200;
        Method = "HEAD";
        Validation = $null
    },
    @{ 
        Endpoint = "/api/history?id=yahoo:AAPL&range=1mo&interval=1d"; 
        Description = "HEAD History (yahoo:AAPL)"; 
        ExpectedStatus = 200;
        Method = "HEAD";
        Validation = $null
    }
)

# Test local URL
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "Testing Local Environment" -ForegroundColor Magenta
Write-Host "Base URL: $BaseUrl" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

foreach ($ep in $endpoints) {
    $method = if ($ep.Method) { $ep.Method } else { "GET" }
    $result = Test-Endpoint -BaseUrl $BaseUrl -Endpoint $ep.Endpoint -Description $ep.Description -ExpectedStatus $ep.ExpectedStatus -Validation $ep.Validation -Method $method
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
        $method = if ($ep.Method) { $ep.Method } else { "GET" }
        $result = Test-Endpoint -BaseUrl $ProdUrl -Endpoint $ep.Endpoint -Description $ep.Description -ExpectedStatus $ep.ExpectedStatus -Validation $ep.Validation -Method $method
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
