# Deployment Guide for 500MB VPS

This guide will help you deploy the application on a VPS with only 500MB of RAM.

## Prerequisites

1. A VPS with at least 500MB RAM (1GB recommended)
2. Ubuntu 20.04 or newer installed
3. SSH access to the VPS

## Setup Instructions

### 1. Update System and Install Docker

```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install docker.io docker-compose -y

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER
```

### 2. Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd planner
```

### 3. Configure Swap Space (Essential for 500MB VPS)

```bash
# Create a 1GB swap file
sudo fallocate -l 1G /swapfile

# Set proper permissions
sudo chmod 600 /swapfile

# Set up the swap space
sudo mkswap /swapfile

# Enable the swap
sudo swapon /swapfile

# Make it permanent by adding to /etc/fstab
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. Deploy with Docker Compose

```bash
# Use the lightweight configuration
docker-compose -f docker-compose-light.yml up -d --build
```

## Memory Optimization Techniques Used

1. **Reduced Docker resource limits:**
   - Database: 150MB limit
   - Backend: 200MB limit
   - Frontend: 150MB limit

2. **Optimized PostgreSQL settings:**
   - Reduced shared_buffers to 24MB
   - Lowered work_mem to 2MB
   - Limited max_connections to 20

3. **Minimized dependencies:**
   - Removed non-essential Python packages
   - Installed only production Node dependencies

4. **Aggressive Node.js memory limits:**
   - Set --max-old-space-size=256

## Monitoring

To monitor memory usage:

```bash
# Check Docker container resource usage
docker stats

# Check system memory usage
free -h

# Check swap usage
swapon --show
```

## Troubleshooting

### If containers keep restarting:

1. Check logs:
   ```bash
   docker-compose -f docker-compose-light.yml logs
   ```

2. Increase swap space to 2GB:
   ```bash
   sudo swapoff /swapfile
   sudo fallocate -l 2G /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### If build fails due to memory:

1. Build containers one at a time:
   ```bash
   docker-compose -f docker-compose-light.yml build db
   docker-compose -f docker-compose-light.yml build backend
   docker-compose -f docker-compose-light.yml build frontend
   docker-compose -f docker-compose-light.yml up -d
   ```

## Accessing the Application

Once deployed, the application will be available at:
- Frontend: http://your-vps-ip:5173
- Backend API: http://your-vps-ip:8000
- Database: localhost:5432 (inside the container)

## Post-Deployment Steps

1. Run database migrations:
   ```bash
   docker-compose -f docker-compose-light.yml exec backend python manage.py migrate
   ```

2. Create a superuser:
   ```bash
   docker-compose -f docker-compose-light.yml exec backend python manage.py createsuperuser
   ```