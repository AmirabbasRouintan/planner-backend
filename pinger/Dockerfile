FROM python:3.11-alpine AS builder

# Set environment variables to reduce memory usage
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build dependencies and psycopg2 dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    postgresql-dev \
    postgresql-client

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-alpine

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache postgresql-client

# Copy installed packages from builder stage
COPY --from=builder /root/.local /root/.local

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Copy project
COPY . .

# Expose port
EXPOSE 8000

# Use runserver for development
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]