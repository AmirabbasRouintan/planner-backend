from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Ticket, ConfigFile, V2RayConfig, UserProfile

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('subject', 'user__username')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ConfigFile)
class ConfigFileAdmin(admin.ModelAdmin):
    list_display = ('name', 'uploaded_by', 'uploaded_at')
    list_filter = ('uploaded_at',)
    search_fields = ('name', 'uploaded_by__username')
    readonly_fields = ('uploaded_at',)

@admin.register(V2RayConfig)
class V2RayConfigAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'text')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'has_v2ray_access', 'is_v2ray_admin', 'created_at')
    list_filter = ('has_v2ray_access', 'is_v2ray_admin', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')

# Extend UserAdmin to show UserProfile inline
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'V2Ray Settings'
    fields = ('has_v2ray_access', 'is_v2ray_admin')

# Create a custom UserAdmin
class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_v2ray_access_status', 'get_v2ray_admin_status')
    
    def get_v2ray_admin_status(self, obj):
        return obj.profile.is_v2ray_admin if hasattr(obj, 'profile') else False
    get_v2ray_admin_status.short_description = 'V2Ray Admin'
    get_v2ray_admin_status.boolean = True
    
    def get_v2ray_access_status(self, obj):
        return obj.profile.has_v2ray_access if hasattr(obj, 'profile') else False
    get_v2ray_access_status.short_description = 'V2Ray Access'
    get_v2ray_access_status.boolean = True

# Unregister the original User admin and register the custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)