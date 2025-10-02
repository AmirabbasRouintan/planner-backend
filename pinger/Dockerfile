FROM python:3.11-slim

# Set environment variables to reduce memory usage
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies required for psycopg2
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies with optimizations
COPY requirements.txt .
RUN pip install --no-cache-dir --compile -r requirements.txt

# Copy project
COPY . .

# Expose port
EXPOSE 8000

# Use gunicorn for production or runserver for development
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]