FROM python:3.11-alpine

# Set environment variables to reduce memory usage
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies including gcc for building packages
RUN apk add --no-cache \
    postgresql-client \
    gcc \
    musl-dev \
    libffi-dev

# Copy requirements and install Python dependencies with conservative memory usage
COPY requirements.txt .

# Install packages with constraints to reduce memory usage
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]