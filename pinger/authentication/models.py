from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class User(AbstractUser):
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    
    def __str__(self):
        return self.username
        
    @property
    def profile_picture_url(self):
        if self.profile_picture:
            # Return complete absolute URL
            if settings.DEBUG:
                return f'http://209.38.203.71:8000{self.profile_picture.url}'
            return self.profile_picture.url
        return None
