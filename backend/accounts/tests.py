from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class UserManagerTests(TestCase):
    def test_create_user_normalizes_email(self):
        user = User.objects.create_user(email='Test@Example.COM', password='supersecret1')
        self.assertEqual(user.email, 'Test@example.com')
        self.assertTrue(user.check_password('supersecret1'))

    def test_create_user_requires_email(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email='', password='supersecret1')
