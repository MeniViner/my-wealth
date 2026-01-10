#!/bin/bash
# Smoke Test Script for API Endpoints (Bash/Termux)
# Tests all API endpoints to verify deployment

set -e

BASE_URL="${1:-https://my-wealth-orcin.vercel.app}"
FAILED=0
TOTAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    local expected_status="${3:-200}"
    local validation="${4:-}"
    local method="${5:-GET}"
    
    TOTAL=$((TOTAL + 1))
    local url="${BASE_URL}${endpoint}"
    
    echo -e "${CYAN}Testing: ${description}${NC}"
    echo -e "  URL: ${url} (${method})"
    
    # Make request and capture status, headers, and body
    local response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Accept: application/json" "$url" 2>&1)
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)
    
    # Check status code
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} (Status: $status)"
        
        # Check for CDN-Cache-Control header
        local cdn_header=$(curl -s -I "$url" 2>&1 | grep -i "cdn-cache-control" | cut -d: -f2 | tr -d ' \r\n')
        if [ -n "$cdn_header" ]; then
            echo -e "  ${YELLOW}CDN-Cache-Control: ${cdn_header}${NC}"
        fi
        
        # Run validation if provided
        if [ -n "$validation" ]; then
            if eval "$validation"; then
                echo -e "  ${GREEN}Validation: ✓${NC}"
            else
                echo -e "  ${RED}✗ Validation failed${NC}"
                FAILED=$((FAILED + 1))
                return 1
            fi
        fi
    else
        echo -e "  ${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status)"
        echo -e "  Body preview: $(echo "$body" | head -c 200)"
        FAILED=$((FAILED + 1))
        return 1
    fi
    
    echo ""
    return 0
}

# Validation functions
validate_search_tase() {
    echo "$body" | jq -e '.[] | select(.id == "tase:1183441")' > /dev/null 2>&1
}

validate_quote_price() {
    local quote=$(echo "$body" | jq 'if type == "array" then .[0] else . end')
    local error=$(echo "$quote" | jq -r '.error // empty')
    local price=$(echo "$quote" | jq -r '.price // 0')
    
    if [ -n "$error" ]; then
        echo -e "    ${RED}✗ Quote has error: ${error}${NC}"
        return 1
    fi
    
    if [ "$price" = "0" ] || [ "$price" = "null" ]; then
        echo -e "    ${RED}✗ Quote has no valid price${NC}"
        return 1
    fi
    
    local currency=$(echo "$quote" | jq -r '.currency // "USD"')
    echo -e "    ${GREEN}✓ Price: ${price} ${currency}${NC}"
    return 0
}

validate_history_points() {
    local points_count=$(echo "$body" | jq '.points | length // 0')
    
    if [ "$points_count" -eq 0 ]; then
        echo -e "    ${RED}✗ History has no points${NC}"
        return 1
    fi
    
    echo -e "    ${GREEN}✓ Points: ${points_count}${NC}"
    return 0
}

# Main tests
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Testing Production Environment${NC}"
echo -e "${CYAN}Base URL: ${BASE_URL}${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Test endpoints
test_endpoint "/api/health" "Health Check" 200

test_endpoint "/api/search?q=1183441" "Search (TASE 1183441)" 200 "validate_search_tase"

test_endpoint "/api/quote?ids=yahoo:AAPL" "Quote (yahoo:AAPL)" 200 "validate_quote_price"

test_endpoint "/api/history?id=yahoo:AAPL&range=1mo&interval=1d" "History (yahoo:AAPL)" 200 "validate_history_points"

test_endpoint "/api/quote?ids=tase:1183441" "Quote (tase:1183441)" 200 "validate_quote_price"

test_endpoint "/api/history?id=tase:1183441&range=1mo&interval=1d" "History (tase:1183441)" 200 "validate_history_points"

# HEAD tests
test_endpoint "/api/health" "HEAD Health Check" 200 "" "HEAD"
test_endpoint "/api/quote?ids=yahoo:AAPL" "HEAD Quote (yahoo:AAPL)" 200 "" "HEAD"
test_endpoint "/api/history?id=yahoo:AAPL&range=1mo&interval=1d" "HEAD History (yahoo:AAPL)" 200 "" "HEAD"

# Summary
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Summary${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

PASSED=$((TOTAL - FAILED))
echo -e "Total Tests: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}Failed: ${FAILED}${NC}"
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Failed: ${FAILED}${NC}"
    echo ""
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
fi
