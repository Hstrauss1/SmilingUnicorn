#!/bin/bash

echo "=========================================="
echo "Setting up SmilingUnicorn Development Environment"
echo "=========================================="
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate venv and install packages
echo ""
echo "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install pdfplumber openai

echo "✓ Python dependencies installed"
echo ""

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p src/testPy/out
mkdir -p src/testPy/PDF
mkdir -p temp

echo "✓ Directories created"
echo ""

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo "✓ Node.js dependencies installed"
echo ""

echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set up Supabase environment variables in .env.local"
echo "2. (Optional) Start vLLM server for AI-powered roadmap generation"
echo "3. Run 'npm run dev' to start the development server"
echo ""
