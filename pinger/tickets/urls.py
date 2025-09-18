from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
    path('api/auth/login/', views.api_login, name='api_login'),
    path('api/auth/register/', views.api_register, name='api_register'),
    path('api/auth/update-profile/', views.api_update_profile, name='api_update_profile'),
    path('api/ticket/', views.create_ticket, name='create_ticket'),
    path('upload/', views.upload_file_view, name='upload_file'),
    path('api/upload/', views.api_upload_file, name='api_upload_file'),
    path('upload/page/', views.file_upload_page, name='file_upload_page'),
    path('api/files/', views.api_list_files, name='api_list_files'),
    path('api/files/<int:file_id>/', views.api_delete_file, name='api_delete_file'),
    path('download/<int:file_id>/', views.download_file, name='download_file'),
    path('api/config/', views.api_config_list, name='api_config_list'),
    path('api/config/<int:config_id>/', views.api_config_detail, name='api_config_detail'),
    path('api/admin/check-status/', views.api_check_admin_status, name='api_check_admin_status'),
    path('api/admin/update-status/', views.api_update_admin_status, name='api_update_admin_status'),
    path('api/users/', views.api_get_users, name='api_get_users'),
    path('v2ray/', views.v2ray_page, name='v2ray_page'),
    path('debug/v2ray/', views.debug_v2ray, name='debug_v2ray'),
    path('api/notes/', views.api_permanent_notes, name='api_permanent_notes'),
    path('api/notes/<int:note_id>/', views.api_permanent_note_detail, name='api_permanent_note_detail'),
]