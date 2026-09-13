import os
from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-threadloom-dev-key')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'storages',

    # Local apps
    'accounts',
    'catalog',
    'designer',
    'orders',
    'production',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'threadloom.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'threadloom.wsgi.application'

# Database configuration
# DATABASE_URL works as-is with a Neon connection string — Neon requires
# TLS, so use its "?sslmode=require" connection string (dj_database_url
# passes sslmode through to OPTIONS automatically). Prefer Neon's *pooled*
# connection string (the one with "-pooler" in the host) here: Neon
# auto-suspends the underlying compute on idle, and pooled connections
# handle that suspend/resume far better than a long-lived direct connection
# held open by conn_max_age.
USE_POSTGRES = config('USE_POSTGRES', default=False, cast=bool)
if USE_POSTGRES:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=config('DATABASE_URL'),
            conn_max_age=600,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
if not DEBUG:
    # Hashed, compressed filenames + long-lived caching — only turned on in
    # production because it requires `collectstatic` to have run (the build
    # step does this on Render); local dev keeps serving straight from disk.
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# S3-compatible object storage (works with real AWS S3 or any compatible
# provider, e.g. Cloudflare R2 — set AWS_S3_ENDPOINT_URL for a non-AWS
# provider, leave it unset to talk to real AWS S3 instead).
USE_S3 = config('USE_S3', default=False, cast=bool)
if USE_S3:
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    # R2 has no AWS-style regions — Cloudflare's own docs say to use
    # 'auto' here. Only defaults to 'auto' when an endpoint override is
    # present (i.e. a non-AWS provider); real AWS S3 still defaults to
    # 'us-east-1' when AWS_S3_ENDPOINT_URL is left unset.
    AWS_S3_ENDPOINT_URL = config('AWS_S3_ENDPOINT_URL', default=None)
    AWS_S3_REGION_NAME = config(
        'AWS_S3_REGION_NAME', default='auto' if AWS_S3_ENDPOINT_URL else 'us-east-1',
    )
    # R2 (and other non-AWS providers) need SigV4 spelled out explicitly.
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    # A public custom domain in front of the bucket (e.g. an R2 custom
    # domain). Leave unset — the default — to build URLs straight from the
    # bucket/endpoint with a presigned querystring instead, which is what
    # a private bucket with no custom domain needs.
    AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default=None)
    # No ACL is set on uploaded objects — modern buckets (and R2 entirely)
    # have ACLs disabled and reject ACL writes outright. Privacy instead
    # comes from the bucket itself being private and every download URL
    # being presigned and short-lived.
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = 3600
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
        'rest_framework.filters.SearchFilter',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'design-save': '30/min',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL', default=False, cast=bool)
# Comma-separated list of extra allowed origins (e.g. the deployed Vercel
# URL) layered on top of the local dev ones, which always stay allowed.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
] + [origin for origin in config('CORS_ALLOWED_ORIGINS', default='').split(',') if origin]

# Needed for the Django admin's session-based login to work behind Render's
# HTTPS-terminating proxy — same idea as CORS_ALLOWED_ORIGINS above, but for
# same-origin form POSTs rather than cross-origin API calls.
CSRF_TRUSTED_ORIGINS = [origin for origin in config('CSRF_TRUSTED_ORIGINS', default='').split(',') if origin]

if not DEBUG:
    # Render's proxy terminates TLS and forwards this header — trust it only
    # in production, where that proxy is guaranteed to be there and to set
    # it correctly (never trust it over an untrusted connection).
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # A conservative starting value (one week) rather than the commonly
    # recommended one year — easy to raise once HTTPS is confirmed stable,
    # hard to walk back quickly since browsers cache it aggressively.
    SECURE_HSTS_SECONDS = 604800

# Celery Configuration
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_ALWAYS_EAGER = config('CELERY_ALWAYS_EAGER', default=False, cast=bool)
# In eager mode (local dev, tests) a task's exception should surface to the
# caller synchronously instead of being swallowed into a FAILURE result —
# request-response views like the embroidery endpoint rely on this to turn
# a validation error (e.g. EmbroideryError) into a proper 4xx response.
CELERY_TASK_EAGER_PROPAGATES = True

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
