#!/bin/bash

# PDF Upload Pipeline - Integration Verification Script
# Run this to verify all components are properly set up

echo "🔍 SmilingUnicorn PDF Upload Pipeline - Verification Script"
echo "============================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
checks_passed=0
checks_failed=0

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1"
        ((checks_failed++))
    fi
}

# 1. Check Node.js and npm
echo "1️⃣  Checking Node.js and npm..."
node --version > /dev/null 2>&1
check_status "Node.js installed"

npm --version > /dev/null 2>&1
check_status "npm installed"

# 2. Check Python3
echo ""
echo "2️⃣  Checking Python3..."
python3 --version > /dev/null 2>&1
check_status "Python3 installed"

# 3. Check Python dependencies
echo ""
echo "3️⃣  Checking Python dependencies..."
python3 -c "import pdfplumber" > /dev/null 2>&1
check_status "pdfplumber installed"

python3 -c "import openai" > /dev/null 2>&1
check_status "openai package installed"

# 4. Check project files
echo ""
echo "4️⃣  Checking project files..."
[ -f "src/testPy/plumb.py" ]
check_status "plumb.py exists"

[ -f "src/testPy/out/FinalTopicGen.py" ]
check_status "FinalTopicGen.py exists"

[ -f "src/testPy/out/stateTest.py" ]
check_status "stateTest.py exists"

[ -f "src/app/api/process-pdf/route.js" ]
check_status "process-pdf API route exists"

[ -f "src/app/dashboard/page.js" ]
check_status "Dashboard page exists"

[ -f "src/app/roadmap/page.js" ]
check_status "Roadmap page exists"

[ -f "src/lib/supabase/coursePacks.js" ]
check_status "coursePacks.js exists"

# 5. Check environment variables
echo ""
echo "5️⃣  Checking environment variables..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
    ((checks_passed++))
    
    # Check for Supabase variables
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL defined"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_URL missing"
        ((checks_failed++))
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY defined"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY missing"
        ((checks_failed++))
    fi
else
    echo -e "${RED}✗${NC} .env.local not found"
    ((checks_failed++))
    echo -e "${YELLOW}⚠${NC}  Create .env.local with Supabase credentials"
fi

# 6. Check node_modules
echo ""
echo "6️⃣  Checking Node dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
    ((checks_passed++))
    
    [ -d "node_modules/@supabase" ]
    check_status "@supabase packages installed"
    
    [ -d "node_modules/next" ]
    check_status "Next.js installed"
else
    echo -e "${RED}✗${NC} node_modules not found"
    ((checks_failed++))
    echo -e "${YELLOW}⚠${NC}  Run: npm install"
fi

# 7. Check output directory
echo ""
echo "7️⃣  Checking output directories..."
[ -d "src/testPy/out" ]
check_status "src/testPy/out directory exists"

[ -d "temp" ] || mkdir -p temp
check_status "temp directory exists or created"

# 8. Test Python scripts (basic syntax check)
echo ""
echo "8️⃣  Testing Python scripts..."
python3 -m py_compile src/testPy/plumb.py > /dev/null 2>&1
check_status "plumb.py syntax valid"

python3 -m py_compile src/testPy/out/FinalTopicGen.py > /dev/null 2>&1
check_status "FinalTopicGen.py syntax valid"

python3 -m py_compile src/testPy/out/stateTest.py > /dev/null 2>&1
check_status "stateTest.py syntax valid"

# 9. Check for VLLM or OpenAI config
echo ""
echo "9️⃣  Checking LLM configuration..."
if [ -f ".env.local" ]; then
    if grep -q "VLLM_BASE_URL" .env.local || grep -q "OPENAI_API_KEY" .env.local; then
        echo -e "${GREEN}✓${NC} LLM configuration found"
        ((checks_passed++))
    else
        echo -e "${YELLOW}⚠${NC}  No VLLM_BASE_URL or OPENAI_API_KEY found"
        echo "    FinalTopicGen.py needs one of these to generate diagnostics"
    fi
fi

# Summary
echo ""
echo "============================================================"
echo "📊 Verification Summary"
echo "============================================================"
echo -e "Checks passed: ${GREEN}${checks_passed}${NC}"
echo -e "Checks failed: ${RED}${checks_failed}${NC}"
echo ""

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! System is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start the dev server: npm run dev"
    echo "  2. Navigate to http://localhost:3000/upload"
    echo "  3. Upload a PDF and test the pipeline"
    echo ""
else
    echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Install Python deps: pip3 install pdfplumber openai"
    echo "  - Install Node deps: npm install"
    echo "  - Create .env.local with Supabase credentials"
    echo ""
    exit 1
fi

# Optional: Check if dev server is running
echo "============================================================"
echo "🚀 Optional: Check if dev server is running"
echo "============================================================"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dev server is running at http://localhost:3000"
else
    echo -e "${YELLOW}⚠${NC}  Dev server not running"
    echo "    Start with: npm run dev"
fi

echo ""
echo "🎉 Verification complete!"
