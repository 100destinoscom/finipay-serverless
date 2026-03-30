#!/usr/bin/env fish

# FinPay Setup Script
# This script helps you set up the FinPay API for development

echo "🚀 FinPay API Setup Script"
echo "=========================="
echo ""

# Check if Node.js is installed
if not command -v node &> /dev/null
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
end

echo "✅ Node.js detected:" (node --version)
echo ""

# Check if npm is installed
if not command -v npm &> /dev/null
    echo "❌ npm is not installed. Please install npm first."
    exit 1
end

echo "✅ npm detected:" (npm --version)
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if test $status -ne 0
    echo "❌ Failed to install dependencies"
    exit 1
end
echo "✅ Dependencies installed"
echo ""

# Check for .env file
if not test -f .env
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env with your actual values before continuing"
    echo ""
    read -P "Press ENTER after you've configured .env..." dummy
else
    echo "✅ .env file exists"
    echo ""
end

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run generate
if test $status -ne 0
    echo "❌ Failed to generate Prisma Client"
    exit 1
end
echo "✅ Prisma Client generated"
echo ""

# Ask about database migrations
echo "🗄️  Database Setup"
echo ""
read -P "Do you want to run database migrations now? (y/n) " -n 1 answer
echo ""

if test "$answer" = "y" -o "$answer" = "Y"
    echo "Running migrations..."
    npm run migrate:dev
    if test $status -eq 0
        echo "✅ Migrations completed"
        echo ""
        
        # Ask about seeding
        read -P "Do you want to seed the database with test data? (y/n) " -n 1 seed_answer
        echo ""
        
        if test "$seed_answer" = "y" -o "$seed_answer" = "Y"
            echo "Seeding database..."
            npm run db:seed
            if test $status -eq 0
                echo "✅ Database seeded"
                echo ""
                echo "Test credentials:"
                echo "  Email: test@finpay.com"
                echo "  Password: password123"
                echo ""
            else
                echo "⚠️  Seeding failed, but you can continue"
                echo ""
            end
        end
    else
        echo "❌ Migrations failed. Please check your DATABASE_URL"
        exit 1
    end
else
    echo "⚠️  Skipping migrations. Run 'npm run migrate:dev' manually when ready."
    echo ""
end

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Start development server: npm run dev"
echo "2. API will be available at: http://localhost:3000"
echo "3. Health check: http://localhost:3000/health"
echo "4. API base: http://localhost:3000/api/v1"
echo ""
echo "Useful commands:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  npm run db:studio    - Open Prisma Studio"
echo "  npm run migrate:dev  - Run migrations"
echo ""
echo "Documentation:"
echo "  README.md                   - Project overview"
echo "  API_DOCUMENTATION.md        - API reference"
echo "  DEPLOYMENT.md               - Deployment guides"
echo "  PYTHON_SERVICE_CONTRACT.md  - Python service spec"
echo ""
echo "Happy coding! 🎉"
