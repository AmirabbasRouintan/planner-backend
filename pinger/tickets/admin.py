from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model
from .models import Ticket, ConfigFile, V2RayConfig, UserProfile, Task, PermanentNote

User = get_user_model()

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
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_v2ray_admin_status')
    
    def get_v2ray_admin_status(self, obj):
        return obj.profile.is_v2ray_admin if hasattr(obj, 'profile') else False
    get_v2ray_admin_status.short_description = 'V2Ray Admin'
    get_v2ray_admin_status.boolean = True
    
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'start_date', 'end_date', 'color')
    list_filter = ('color', 'start_date', 'created_at')
    search_fields = ('title', 'user__username')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(PermanentNote)
class PermanentNoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'content', 'user__username')
    readonly_fields = ('created_at', 'updated_at')
    def get_v2ray_access_status(self, obj):
        return obj.profile.has_v2ray_access if hasattr(obj, 'profile') else False
    get_v2ray_access_status.short_description = 'V2Ray Access'
    get_v2ray_access_status.boolean = True

# Register the custom User admin
admin.site.register(User, CustomUserAdmin)