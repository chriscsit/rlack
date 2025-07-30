#!/bin/bash

# Rlack Setup Script
echo "🚀 Setting up Rlack development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Setup environment files
echo "⚙️ Setting up environment files..."
if [ ! -f packages/backend/.env ]; then
    cp packages/backend/.env.example packages/backend/.env
    echo "✅ Created backend .env file"
fi

if [ ! -f packages/web/.env ]; then
    echo "VITE_API_URL=http://localhost:3001" > packages/web/.env
    echo "✅ Created web .env file"
fi

# Create uploads directory
mkdir -p packages/backend/uploads
echo "✅ Created uploads directory"

echo ""
echo "🎉 Setup complete! Here's how to get started:"
echo ""
echo "1. Start the backend:"
echo "   cd packages/backend && npm run dev"
echo ""
echo "2. Start the web app:"
echo "   cd packages/web && npm run dev"
echo ""
echo "3. Start the desktop app:"
echo "   cd packages/desktop && npm run dev"
echo ""
echo "4. Or start everything at once:"
echo "   npm run dev:all"
echo ""
echo "📝 Don't forget to:"
echo "   - Set up your PostgreSQL database"
echo "   - Update packages/backend/.env with your database URL"
echo "   - Run 'npm run db:migrate' in the backend to set up the database"
echo ""
echo "🔗 URLs:"
echo "   - Web app: http://localhost:3000"
echo "   - API: http://localhost:3001"
echo "   - Desktop: Native macOS app"