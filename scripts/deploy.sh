#!/bin/bash

# Rlack Deployment Script
# This script handles building and deploying the Rlack application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    exit 1
}

check_dependencies() {
    log "Checking dependencies..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed."
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is required but not installed."
    
    success "All dependencies are installed."
}

check_env_file() {
    log "Checking environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        warning "Creating .env file from template..."
        cat > "$ENV_FILE" << EOF
# Database
POSTGRES_PASSWORD=rlack_secure_password_$(openssl rand -hex 16)

# Authentication
JWT_SECRET=jwt_secret_$(openssl rand -hex 32)

# Application
CLIENT_URL=http://localhost:3000
NODE_ENV=production

# Optional: External services
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-email@example.com
# SMTP_PASS=your-password
# S3_BUCKET_NAME=your-s3-bucket
# S3_ACCESS_KEY=your-access-key
# S3_SECRET_KEY=your-secret-key
# S3_REGION=us-east-1
EOF
        success "Environment file created. Please review and update .env file before continuing."
        warning "Generated secure passwords for database and JWT secret."
    else
        success "Environment file exists."
    fi
}

build_application() {
    log "Building Rlack application..."
    
    # Stop existing containers
    docker-compose -f "$COMPOSE_FILE" down
    
    # Build new images
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    success "Application built successfully."
}

run_migrations() {
    log "Running database migrations..."
    
    # Start only the database
    docker-compose -f "$COMPOSE_FILE" up -d postgres
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    docker-compose -f "$COMPOSE_FILE" run --rm rlack npm run db:migrate
    
    success "Database migrations completed."
}

start_services() {
    log "Starting all services..."
    
    # Start all services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait a moment for services to start
    sleep 5
    
    # Check if services are healthy
    check_health
    
    success "All services started successfully."
}

check_health() {
    log "Checking service health..."
    
    # Check database
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U rlack >/dev/null 2>&1; then
        success "✓ Database is healthy"
    else
        error "✗ Database is not responding"
    fi
    
    # Check Redis
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping >/dev/null 2>&1; then
        success "✓ Redis is healthy"
    else
        error "✗ Redis is not responding"
    fi
    
    # Check application
    sleep 3
    if curl -f http://localhost/health >/dev/null 2>&1; then
        success "✓ Application is healthy"
    else
        warning "⚠ Application health check failed - it may still be starting up"
    fi
}

show_status() {
    log "Current service status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log "Application URLs:"
    echo "  🌐 Web Application: http://localhost"
    echo "  🔧 API Health: http://localhost/health"
    echo "  📊 Database: localhost:5432"
    echo ""
    log "To view logs: docker-compose logs -f"
    log "To stop services: docker-compose down"
    log "To update: ./scripts/deploy.sh --update"
}

backup_data() {
    log "Creating backup..."
    
    BACKUP_DIR="./backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U rlack rlack > "$BACKUP_DIR/database_$TIMESTAMP.sql"
    
    # Backup uploads
    docker cp $(docker-compose -f "$COMPOSE_FILE" ps -q rlack):/app/packages/backend/uploads "$BACKUP_DIR/uploads_$TIMESTAMP" 2>/dev/null || true
    
    success "Backup created in $BACKUP_DIR/"
}

update_application() {
    log "Updating Rlack application..."
    
    # Create backup first
    backup_data
    
    # Pull latest changes (if in git repo)
    if [ -d ".git" ]; then
        log "Pulling latest changes..."
        git pull
    fi
    
    # Rebuild and restart
    build_application
    run_migrations
    start_services
    
    success "Application updated successfully."
}

# Main script
main() {
    case "${1:-deploy}" in
        "deploy")
            log "Starting Rlack deployment..."
            check_dependencies
            check_env_file
            build_application
            run_migrations
            start_services
            show_status
            success "🚀 Rlack deployment completed successfully!"
            ;;
        "--update")
            update_application
            show_status
            ;;
        "--backup")
            backup_data
            ;;
        "--status")
            show_status
            ;;
        "--health")
            check_health
            ;;
        "--logs")
            docker-compose -f "$COMPOSE_FILE" logs -f
            ;;
        "--stop")
            log "Stopping all services..."
            docker-compose -f "$COMPOSE_FILE" down
            success "All services stopped."
            ;;
        "--clean")
            warning "This will remove all containers and volumes. Are you sure? (y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                docker-compose -f "$COMPOSE_FILE" down -v
                docker system prune -f
                success "Cleanup completed."
            else
                log "Cleanup cancelled."
            fi
            ;;
        "--help")
            echo "Rlack Deployment Script"
            echo ""
            echo "Usage: $0 [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  deploy     Deploy the application (default)"
            echo "  --update   Update existing deployment"
            echo "  --backup   Create data backup"
            echo "  --status   Show service status"
            echo "  --health   Check service health"
            echo "  --logs     Show service logs"
            echo "  --stop     Stop all services"
            echo "  --clean    Remove all containers and volumes"
            echo "  --help     Show this help message"
            ;;
        *)
            error "Unknown command: $1. Use --help for usage information."
            ;;
    esac
}

# Run main function
main "$@"