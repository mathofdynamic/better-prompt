#!/bin/bash

# Better Prompt - Local Development Server
# This script starts a local server to avoid CORS issues

echo "🚀 Starting Better Prompt development server..."
echo "📁 Current directory: $(pwd)"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found, starting server..."
    python3 server.py
elif command -v python &> /dev/null; then
    echo "✅ Python found, starting server..."
    python server.py
else
    echo "❌ Python not found. Please install Python to run the local server."
    echo ""
    echo "Alternative: Use any local server like:"
    echo "  - Live Server (VS Code extension)"
    echo "  - http-server (npm install -g http-server)"
    echo "  - Python: python -m http.server 8000"
    echo "  - Node.js: npx serve ."
    exit 1
fi
