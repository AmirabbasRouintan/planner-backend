FROM python:3.11-alpine

# Set environment variables to reduce memory usage
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONMALLOC=malloc \
    POETRY_VENV_IN_PROJECT=true

WORKDIR /app

# Install system dependencies including gcc for building packages
RUN apk add --no-cache \
    postgresql-client \
    gcc \
    musl-dev \
    libffi-dev

# Copy requirements and install Python dependencies with conservative memory usage
COPY requirements.txt .

# Install packages individually to reduce peak memory usage
RUN pip install --no-cache-dir --force-reinstall --no-deps altgraph==0.17.4 && \
    pip install --no-cache-dir --force-reinstall --no-deps asgiref==3.9.1 && \
    pip install --no-cache-dir --force-reinstall --no-deps certifi==2025.8.3 && \
    pip install --no-cache-dir --force-reinstall --no-deps charset-normalizer==3.4.3 && \
    pip install --no-cache-dir --force-reinstall --no-deps Django==5.2.5 && \
    pip install --no-cache-dir --force-reinstall --no-deps django-admin==2.0.2 && \
    pip install --no-cache-dir --force-reinstall --no-deps django-cors-headers==4.7.0 && \
    pip install --no-cache-dir --force-reinstall --no-deps django-excel-response2==3.0.6 && \
    pip install --no-cache-dir --force-reinstall --no-deps django-six==1.0.5 && \
    pip install --no-cache-dir --force-reinstall --no-deps djangorestframework==3.16.1 && \
    pip install --no-cache-dir --force-reinstall --no-deps djangorestframework-simplejwt==5.5.1 && \
    pip install --no-cache-dir --force-reinstall --no-deps excel-base==1.0.4 && \
    pip install --no-cache-dir --force-reinstall --no-deps idna==3.10 && \
    pip install --no-cache-dir --force-reinstall --no-deps isoweek==1.3.3 && \
    pip install --no-cache-dir --force-reinstall --no-deps packaging==25.0 && \
    pip install --no-cache-dir --force-reinstall --no-deps pillow==10.2.0 && \
    pip install --no-cache-dir --force-reinstall --no-deps PyJWT==2.10.1 && \
    pip install --no-cache-dir --force-reinstall --no-deps python-dateutil==2.9.0.post0 && \
    pip install --no-cache-dir --force-reinstall --no-deps python-decouple==3.8 && \
    pip install --no-cache-dir --force-reinstall --no-deps requests==2.31.0 && \
    pip install --no-cache-dir --force-reinstall --no-deps psycopg2-binary==2.9.9 && \
    pip install --no-cache-dir --force-reinstall --no-deps xlwt && \
    pip install --no-cache-dir --force-reinstall --no-deps screen

# Copy application code
COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]