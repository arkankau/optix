#!/bin/bash

# Nearify Exam Setup Verification Script

echo "🔍 Verifying Nearify Exam Setup..."
echo ""

# Check Node version
echo "1️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js installed: $NODE_VERSION"
    
    # Check if version is >= 18
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo "   ✅ Version is >= 18"
    else
        echo "   ⚠️  Version is < 18 (recommended: v18+)"
    fi
else
    echo "   ❌ Node.js not found"
    echo "   Install from: https://nodejs.org"
    exit 1
fi

echo ""

# Check pnpm
echo "2️⃣  Checking pnpm..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo "   ✅ pnpm installed: v$PNPM_VERSION"
else
    echo "   ⚠️  pnpm not found"
    echo "   Installing pnpm..."
    npm install -g pnpm
    if [ $? -eq 0 ]; then
        echo "   ✅ pnpm installed successfully"
    else
        echo "   ❌ Failed to install pnpm"
        exit 1
    fi
fi

echo ""

# Check directory structure
echo "3️⃣  Checking project structure..."
REQUIRED_DIRS=(
    "apps/api"
    "apps/web"
    "packages/core"
    "packages/voice"
    "packages/agent"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir"
    else
        echo "   ❌ $dir missing"
    fi
done

echo ""

# Check package.json files
echo "4️⃣  Checking package.json files..."
PACKAGE_FILES=(
    "package.json"
    "apps/api/package.json"
    "apps/web/package.json"
    "packages/core/package.json"
    "packages/voice/package.json"
    "packages/agent/package.json"
)

for file in "${PACKAGE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file missing"
    fi
done

echo ""

# Check if dependencies are installed
echo "5️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ Root dependencies installed"
else
    echo "   ⚠️  Root dependencies not installed"
    echo "   Run: pnpm install"
fi

if [ -d "apps/api/node_modules" ]; then
    echo "   ✅ API dependencies installed"
else
    echo "   ⚠️  API dependencies not installed"
fi

if [ -d "apps/web/node_modules" ]; then
    echo "   ✅ Web dependencies installed"
else
    echo "   ⚠️  Web dependencies not installed"
fi

echo ""

# Check .env file
echo "6️⃣  Checking environment configuration..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    
    # Check for API keys
    if grep -q "ELEVENLABS_API_KEY=" .env; then
        if grep -q "ELEVENLABS_API_KEY=$" .env || grep -q "ELEVENLABS_API_KEY=\"\"" .env; then
            echo "   ⚠️  ELEVENLABS_API_KEY not set (will use mock)"
        else
            echo "   ✅ ELEVENLABS_API_KEY configured"
        fi
    fi
    
    if grep -q "GEMINI_API_KEY=" .env; then
        if grep -q "GEMINI_API_KEY=$" .env || grep -q "GEMINI_API_KEY=\"\"" .env; then
            echo "   ⚠️  GEMINI_API_KEY not set (will use mock)"
        else
            echo "   ✅ GEMINI_API_KEY configured"
        fi
    fi
    
    if grep -q "XAI_GROK_API_KEY=" .env; then
        if grep -q "XAI_GROK_API_KEY=$" .env || grep -q "XAI_GROK_API_KEY=\"\"" .env; then
            echo "   ⚠️  XAI_GROK_API_KEY not set (will use fallback)"
        else
            echo "   ✅ XAI_GROK_API_KEY configured"
        fi
    fi
else
    echo "   ⚠️  .env file not found"
    echo "   Creating .env from template..."
    cat > .env << 'EOF'
ELEVENLABS_API_KEY=
GEMINI_API_KEY=
XAI_GROK_API_KEY=
PHOTON_API_KEY=
DEDALUS_API_KEY=
FRONTEND_ORIGIN=http://localhost:5173
PORT=8787
DATABASE_URL=file:./nearify.sqlite
EOF
    echo "   ✅ Created .env file"
    echo "   ℹ️  Edit .env to add your API keys (optional)"
fi

echo ""

# Check TypeScript config
echo "7️⃣  Checking TypeScript configuration..."
TS_CONFIGS=(
    "packages/core/tsconfig.json"
    "packages/voice/tsconfig.json"
    "packages/agent/tsconfig.json"
    "apps/api/tsconfig.json"
    "apps/web/tsconfig.json"
)

for config in "${TS_CONFIGS[@]}"; do
    if [ -f "$config" ]; then
        echo "   ✅ $config"
    else
        echo "   ❌ $config missing"
    fi
done

echo ""

# Check pnpm workspace
echo "8️⃣  Checking pnpm workspace..."
if [ -f "pnpm-workspace.yaml" ]; then
    echo "   ✅ pnpm-workspace.yaml exists"
else
    echo "   ❌ pnpm-workspace.yaml missing"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Final summary
echo "📊 Setup Summary:"
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Setup incomplete: Node.js required"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ Setup incomplete: pnpm required"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencies not installed"
    echo ""
    echo "Next steps:"
    echo "  1. Run: pnpm install"
    echo "  2. Run: pnpm dev"
    echo "  3. Open: http://localhost:5173"
else
    echo "✅ Setup looks good!"
    echo ""
    echo "Ready to start:"
    echo "  1. Run: pnpm dev"
    echo "  2. Open: http://localhost:5173"
    echo ""
    echo "Optional:"
    echo "  - Add API keys to .env for full functionality"
    echo "  - Read QUICKSTART.md for detailed guide"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"



