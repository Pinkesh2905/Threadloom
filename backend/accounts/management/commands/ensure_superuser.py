import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    """Idempotent alternative to `createsuperuser` for deploy pipelines with
    no shell access (e.g. Render's free tier) — safe to run on every build.

    Reads DJANGO_SUPERUSER_EMAIL / DJANGO_SUPERUSER_PASSWORD from the
    environment. Does nothing if either is unset, or if a user with that
    email already exists (never resets an existing password — a stale env
    var value shouldn't silently overwrite a real admin's credentials)."""

    help = 'Creates a superuser from DJANGO_SUPERUSER_EMAIL/PASSWORD env vars, if one does not already exist.'

    def handle(self, *args, **options):
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

        if not email or not password:
            self.stdout.write('DJANGO_SUPERUSER_EMAIL/PASSWORD not set — skipping.')
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(f'Superuser {email} already exists — skipping.')
            return

        User.objects.create_superuser(email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f'Created superuser {email}.'))
