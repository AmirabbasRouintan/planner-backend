from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError
import json
import os
from .models import Ticket, ConfigFile, V2RayConfig, UserProfile, PermanentNote


def add_cors_headers(view_func):
    """Decorator to add CORS headers to API responses"""
    def wrapper(request, *args, **kwargs):
        response = view_func(request, *args, **kwargs)
        
        # Add CORS headers
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-Admin-Password, Authorization'
        response['Access-Control-Allow-Credentials'] = 'true'
        
        # Handle preflight OPTIONS requests
        if request.method == 'OPTIONS':
            response = JsonResponse({'status': 'ok'})
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-Admin-Password, Authorization'
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
            
        return response
    return wrapper

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid username or password')
    
    return render(request, 'tickets/login.html')

def logout_view(request):
    logout(request)
    return redirect('login')

@login_required
def dashboard_view(request):
    tickets = Ticket.objects.filter(user=request.user)
    
    # Check if user has V2Ray access
    has_v2ray_access = True
    if hasattr(request.user, 'profile'):
        has_v2ray_access = request.user.profile.has_v2ray_access
    
    return render(request, 'tickets/dashboard.html', {
        'tickets': tickets,
        'has_v2ray_access': has_v2ray_access
    })

@csrf_exempt
@add_cors_headers
def create_ticket(request):
    if request.method == 'POST':
        try:
            # Parse JSON data from request
            data = json.loads(request.body)
            username = data.get('username')
            email = data.get('email')
            reason = data.get('reason')
            
            # Get or create user
            user, created = User.objects.get_or_create(
                username=username,
                defaults={'email': email}
            )
            
            # Create ticket
            ticket = Ticket.objects.create(
                user=user,
                subject=f"New Config Request from {username}",
                description=reason,
                status='pending'
            )
            
            return JsonResponse({
                'status': 'success',
                'message': f'user {username} asked for the new configs'
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            })
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    })

@login_required
def admin_dashboard(request):
    if not request.user.is_staff:
        return redirect('dashboard')
    
    tickets = Ticket.objects.all()
    config_files = ConfigFile.objects.all()
    configs = V2RayConfig.objects.all()
    return render(request, 'tickets/admin_dashboard.html', {
        'tickets': tickets,
        'config_files': config_files,
        'configs': configs
    })

@login_required
def upload_file_view(request):
    if request.method == 'POST' and request.FILES.get('file'):
        uploaded_file = request.FILES['file']
        
        # Check if file is a .txt file
        if uploaded_file.name.endswith('.txt'):
            # Save the file using the ConfigFile model
            config_file = ConfigFile(
                name=uploaded_file.name,
                file=uploaded_file,
                uploaded_by=request.user
            )
            config_file.save()
            
            messages.success(request, 'File uploaded successfully!')
            return redirect('dashboard')
        else:
            messages.error(request, 'Only .txt files are allowed!')
    
    return redirect('dashboard')

@csrf_exempt
@add_cors_headers
def api_upload_file(request):
    """
    API endpoint for uploading files without CSRF token requirement
    """
    if request.method == 'POST' and request.FILES.get('file'):
        # For API uploads, we'll associate with a default user or create one
        # In a real application, you might want to authenticate via token
        uploaded_file = request.FILES['file']
        
        # Check if file is a .txt file
        if uploaded_file.name.endswith('.txt'):
            # Get or create a default user for API uploads
            user, created = User.objects.get_or_create(
                username='api_user',
                defaults={'email': 'api@example.com'}
            )
            
            # Save the file using the ConfigFile model
            config_file = ConfigFile(
                name=uploaded_file.name,
                file=uploaded_file,
                uploaded_by=user
            )
            config_file.save()
            
            return JsonResponse({
                'status': 'success',
                'message': 'File uploaded successfully!',
                'file_id': config_file.id,
                'file_name': config_file.name
            })
        else:
            return JsonResponse({
                'status': 'error',
                'message': 'Only .txt files are allowed!'
            }, status=400)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method or no file provided'
    }, status=400)

@login_required
def file_upload_page(request):
    """
    Dedicated page for file uploads
    """
    return render(request, 'tickets/file_upload.html')

@csrf_exempt
@add_cors_headers
def api_list_files(request):
    """
    API endpoint for listing all uploaded files
    """
    if request.method == 'GET':
        try:
            # Get all config files
            config_files = ConfigFile.objects.all()
            
            # Format the response
            files_data = []
            for file in config_files:
                files_data.append({
                    'id': file.id,
                    'name': file.name,
                    'size': file.file.size if file.file else 0,
                    'url': file.file.url if file.file else '',
                    'uploaded_by': file.uploaded_by.username,
                    'uploaded_at': file.uploaded_at.isoformat()
                })
            
            return JsonResponse({
                'status': 'success',
                'files': files_data
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@csrf_exempt
@add_cors_headers
def api_login(request):
    """
    API endpoint for user login
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Email and password are required'
                }, status=400)
            
            # Try to find user by email
            try:
                user = User.objects.get(email=email)
                username = user.username
            except User.DoesNotExist:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid email or password'
                }, status=401)
            
            # Authenticate user
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                
                # Check if user has a profile
                is_v2ray_admin = False
                has_v2ray_access = True  # Default value
                if hasattr(user, 'profile'):
                    is_v2ray_admin = user.profile.is_v2ray_admin
                    has_v2ray_access = user.profile.has_v2ray_access
                
                # Return user data and token
                return JsonResponse({
                    'status': 'success',
                    'token': 'dummy_token',  # In production, use proper token generation
                    'user': {
                        'id': str(user.id),
                        'username': user.username,
                        'email': user.email,
                        'name': user.first_name + ' ' + user.last_name if user.first_name or user.last_name else '',
                        'is_admin': user.is_staff,
                        'is_v2ray_admin': is_v2ray_admin,
                        'has_v2ray_access': has_v2ray_access
                    }
                })
            else:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid email or password'
                }, status=401)
                
        except json.JSONDecodeError:
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@csrf_exempt
@add_cors_headers
def api_register(request):
    """
    API endpoint for user registration
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            password2 = data.get('password2')
            name = data.get('name', '')
            username = data.get('username')
            
            # Validation
            if not all([email, password, password2, username]):
                return JsonResponse({
                    'status': 'error',
                    'message': 'All fields are required'
                }, status=400)
            
            if password != password2:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Passwords do not match'
                }, status=400)
            
            if User.objects.filter(email=email).exists():
                return JsonResponse({
                    'status': 'error',
                    'message': 'Email already exists'
                }, status=400)
            
            if User.objects.filter(username=username).exists():
                return JsonResponse({
                    'status': 'error',
                    'message': 'Username already exists'
                }, status=400)
            
            # Create user
            try:
                user = User.objects.create(
                    username=username,
                    email=email,
                    password=make_password(password),
                    first_name=name.split(' ')[0] if name else '',
                    last_name=' '.join(name.split(' ')[1:]) if len(name.split(' ')) > 1 else ''
                )
                
                # Login user after registration
                login(request, user)
                
                # Check if user has a profile
                is_v2ray_admin = False
                has_v2ray_access = True  # Default value
                if hasattr(user, 'profile'):
                    is_v2ray_admin = user.profile.is_v2ray_admin
                    has_v2ray_access = user.profile.has_v2ray_access
                
                return JsonResponse({
                    'status': 'success',
                    'token': 'dummy_token',  # In production, use proper token generation
                    'user': {
                        'id': str(user.id),
                        'username': user.username,
                        'email': user.email,
                        'name': name,
                        'is_admin': user.is_staff,
                        'is_v2ray_admin': is_v2ray_admin,
                        'has_v2ray_access': has_v2ray_access
                    }
                })
                
            except IntegrityError:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Failed to create user'
                }, status=500)
                
        except json.JSONDecodeError:
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@csrf_exempt
@add_cors_headers
def api_update_profile(request):
    """
    API endpoint for updating user profile
    """
    if request.method == 'PATCH':
        try:
            # Get token from Authorization header
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header.startswith('Token '):
                return JsonResponse({
                    'status': 'error',
                    'message': 'Authentication required'
                }, status=401)
            
            token = auth_header.split(' ')[1]
            
            # For now, we'll use a simple token check
            # In production, implement proper token validation
            if token != 'dummy_token':
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid token'
                }, status=401)
            
            data = json.loads(request.body)
            name = data.get('name', '')
            
            if not name.strip():
                return JsonResponse({
                    'status': 'error',
                    'message': 'Name cannot be empty'
                }, status=400)
            
            # For now, we'll update the first user we find
            # In production, get user from token
            user = User.objects.first()
            if not user:
                return JsonResponse({
                    'status': 'error',
                    'message': 'User not found'
                }, status=404)
            
            # Update user name
            if name:
                name_parts = name.split(' ', 1)
                user.first_name = name_parts[0]
                if len(name_parts) > 1:
                    user.last_name = name_parts[1]
                else:
                    user.last_name = ''
                user.save()
            
            return JsonResponse({
                'status': 'success',
                'message': 'Profile updated successfully',
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'name': user.first_name + ' ' + user.last_name if user.first_name or user.last_name else '',
                    'is_admin': user.is_staff,
                    'is_v2ray_admin': user.profile.is_v2ray_admin if hasattr(user, 'profile') else False
                }
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

def download_file(request, file_id):
    """
    View to download a specific file by ID
    """
    try:
        config_file = ConfigFile.objects.get(id=file_id)
        response = HttpResponse(config_file.file, content_type='text/plain')
        response['Content-Disposition'] = f'attachment; filename="{config_file.name}"'
        return response
    except ConfigFile.DoesNotExist:
        raise Http404("File not found")

@csrf_exempt
@add_cors_headers
def api_config_list(request):
    """
    API endpoint for listing and creating v2ray configurations
    """
    if request.method == 'GET':
        try:
            # Get all v2ray configurations
            configs = V2RayConfig.objects.all()
            
            # Format the response
            configs_data = []
            for config_obj in configs:
                configs_data.append({
                    'id': config_obj.id,
                    'title': config_obj.title,
                    'text': config_obj.text,
                    'status': config_obj.status,
                    'created_at': config_obj.created_at.isoformat(),
                    'updated_at': config_obj.updated_at.isoformat()
                })
            
            return JsonResponse({
                'status': 'success',
                'configs': configs_data
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    elif request.method == 'POST':
        try:
            # Parse JSON data from request
            data = json.loads(request.body)
            title = data.get('title')
            text = data.get('text')
            status = data.get('status', 'off')
            
            # Validate status
            if status not in ['on', 'off']:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Status must be either "on" or "off"'
                }, status=400)
            
            # Create config
            config_obj = V2RayConfig.objects.create(
                title=title,
                text=text,
                status=status
            )
            
            return JsonResponse({
                'status': 'success',
                'message': 'V2Ray config created successfully',
                'config': {
                    'id': config_obj.id,
                    'title': config_obj.title,
                    'text': config_obj.text,
                    'status': config_obj.status,
                    'created_at': config_obj.created_at.isoformat(),
                    'updated_at': config_obj.updated_at.isoformat()
                }
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@csrf_exempt
@add_cors_headers
def api_config_detail(request, config_id):
    """
    API endpoint for retrieving, updating, or deleting a specific v2ray configuration
    """
    # Check for admin password in headers for DELETE requests
    if request.method == 'DELETE':
        admin_password = request.META.get('HTTP_X_ADMIN_PASSWORD')
        if admin_password != 'abbaswww':
            return JsonResponse({
                'status': 'error',
                'message': 'Authentication required'
            }, status=401)
    
    try:
        config_obj = V2RayConfig.objects.get(id=config_id)
    except V2RayConfig.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': 'V2Ray config not found'
        }, status=404)
    
    if request.method == 'GET':
        # Return config details
        return JsonResponse({
            'status': 'success',
            'config': {
                'id': config_obj.id,
                'title': config_obj.title,
                'text': config_obj.text,
                'status': config_obj.status,
                'created_at': config_obj.created_at.isoformat(),
                'updated_at': config_obj.updated_at.isoformat()
            }
        })
    
    elif request.method == 'PUT':
        try:
            # Parse JSON data from request
            data = json.loads(request.body)
            title = data.get('title', config_obj.title)
            text = data.get('text', config_obj.text)
            status = data.get('status', config_obj.status)
            
            # Validate status
            if status not in ['on', 'off']:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Status must be either "on" or "off"'
                }, status=400)
            
            # Update config
            config_obj.title = title
            config_obj.text = text
            config_obj.status = status
            config_obj.save()
            
            return JsonResponse({
                'status': 'success',
                'message': 'V2Ray config updated successfully',
                'config': {
                    'id': config_obj.id,
                    'title': config_obj.title,
                    'text': config_obj.text,
                    'status': config_obj.status,
                    'created_at': config_obj.created_at.isoformat(),
                    'updated_at': config_obj.updated_at.isoformat()
                }
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    elif request.method == 'DELETE':
        # Delete config
        config_obj.delete()
        return JsonResponse({
            'status': 'success',
            'message': 'V2Ray config deleted successfully'
        })
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@csrf_exempt
@add_cors_headers
def api_delete_file(request, file_id):
    """
    API endpoint for deleting a specific file with password authentication
    """
    # Check for admin password in headers
    admin_password = request.META.get('HTTP_X_ADMIN_PASSWORD')
    if admin_password != 'abbaswww':
        return JsonResponse({
            'status': 'error',
            'message': 'Authentication required'
        }, status=401)
    
    try:
        config_file = ConfigFile.objects.get(id=file_id)
    except ConfigFile.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': 'File not found'
        }, status=404)
    
    if request.method == 'DELETE':
        # Delete file
        config_file.delete()
        return JsonResponse({
            'status': 'success',
            'message': 'File deleted successfully'
        })
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@csrf_exempt
@add_cors_headers
def api_check_admin_status(request):
    """
    API endpoint for checking if current user is V2Ray admin
    """
    if request.method == 'GET':
        try:
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Authentication required'
                }, status=401)
            
            # Check if user has V2Ray admin profile
            is_v2ray_admin = False
            if hasattr(request.user, 'profile'):
                is_v2ray_admin = request.user.profile.is_v2ray_admin
            
            return JsonResponse({
                'status': 'success',
                'is_v2ray_admin': is_v2ray_admin
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@csrf_exempt
@add_cors_headers
def api_get_users(request):
    """
    API endpoint for retrieving user data
    """
    if request.method == 'GET':
        try:
            # Get all users with their profiles
            users = User.objects.all().select_related('profile')
            
            # Format the response
            users_data = []
            for user in users:
                # Get profile data if exists
                is_v2ray_admin = False
                has_v2ray_access = True
                created_at = None
                updated_at = None
                
                if hasattr(user, 'profile'):
                    is_v2ray_admin = user.profile.is_v2ray_admin
                    has_v2ray_access = user.profile.has_v2ray_access
                    created_at = user.profile.created_at.isoformat() if user.profile.created_at else None
                    updated_at = user.profile.updated_at.isoformat() if user.profile.updated_at else None
                
                users_data.append({
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_staff': user.is_staff,
                    'is_active': user.is_active,
                    'is_v2ray_admin': is_v2ray_admin,
                    'has_v2ray_access': has_v2ray_access,
                    'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                    'profile_created_at': created_at,
                    'profile_updated_at': updated_at
                })
            
            return JsonResponse({
                'status': 'success',
                'users': users_data,
                'count': len(users_data)
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@csrf_exempt
@add_cors_headers
def api_update_admin_status(request):
    """
    API endpoint for updating user's V2Ray admin status
    """
    if request.method == 'POST':
        try:
            # Parse JSON data from request
            data = json.loads(request.body)
            user_id = data.get('user_id')
            is_v2ray_admin = data.get('is_v2ray_admin', False)
            
            # Get the user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return JsonResponse({
                    'status': 'error',
                    'message': 'User not found'
                }, status=404)
            
            # Get or create user profile
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            # Update the V2Ray admin status
            profile.is_v2ray_admin = is_v2ray_admin
            profile.save()
            
            return JsonResponse({
                'status': 'success',
                'message': f'User {user.username} V2Ray admin status updated',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'is_v2ray_admin': profile.is_v2ray_admin
                }
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    }, status=405)

@login_required
def v2ray_page(request):
    """
    Dedicated V2Ray page with client/admin tabs
    """
    # Check if user is V2Ray admin
    is_v2ray_admin = False
    if hasattr(request.user, 'profile'):
        is_v2ray_admin = request.user.profile.is_v2ray_admin
    
    # Get all v2ray configurations
    configs = V2RayConfig.objects.all()
    
    # Get all config files
    config_files = ConfigFile.objects.all()
    
    return render(request, 'tickets/v2ray_page.html', {
        'configs': configs,
        'config_files': config_files,
        'is_v2ray_admin': is_v2ray_admin,
        'has_v2ray_access': True,  # Always allow access
        'user': request.user  # Add user to context for debugging
    })

@login_required
def debug_v2ray(request):
    """
    Debug page for V2Ray access
    """
    # Check if user has V2Ray access
    has_v2ray_access = True
    if hasattr(request.user, 'profile'):
        has_v2ray_access = request.user.profile.has_v2ray_access
    
    # Check if user is V2Ray admin
    is_v2ray_admin = False
    if hasattr(request.user, 'profile'):
        is_v2ray_admin = request.user.profile.is_v2ray_admin
    
    return render(request, 'tickets/debug_v2ray.html', {
        'is_v2ray_admin': is_v2ray_admin,
        'user': request.user
    })

@csrf_exempt
@add_cors_headers
def api_permanent_notes(request):
    """
    API endpoint for managing permanent notes.
    GET: Retrieve all notes for the authenticated user
    POST: Create a new note for the authenticated user
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    if request.method == 'GET':
        try:
            notes = PermanentNote.objects.filter(user=request.user)
            notes_data = [
                {
                    'id': note.id,
                    'title': note.title,
                    'content': note.content,
                    'created_at': note.created_at.isoformat(),
                    'updated_at': note.updated_at.isoformat()
                }
                for note in notes
            ]
            return JsonResponse({'notes': notes_data})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            content = data.get('content', '')
            title = data.get('title', '')
            
            if not content:
                return JsonResponse({'error': 'Content is required'}, status=400)
            
            note = PermanentNote.objects.create(
                user=request.user,
                title=title,
                content=content
            )
            
            return JsonResponse({
                'id': note.id,
                'title': note.title,
                'content': note.content,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat()
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@add_cors_headers
def api_permanent_note_detail(request, note_id):
    """
    API endpoint for managing a specific permanent note.
    GET: Retrieve a specific note
    PUT: Update a specific note
    DELETE: Delete a specific note
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        note = PermanentNote.objects.get(id=note_id, user=request.user)
    except PermanentNote.DoesNotExist:
        return JsonResponse({'error': 'Note not found'}, status=404)
    
    if request.method == 'GET':
        return JsonResponse({
            'id': note.id,
            'title': note.title,
            'content': note.content,
            'created_at': note.created_at.isoformat(),
            'updated_at': note.updated_at.isoformat()
        })
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            note.title = data.get('title', note.title)
            note.content = data.get('content', note.content)
            note.save()
            
            return JsonResponse({
                'id': note.id,
                'title': note.title,
                'content': note.content,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat()
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    elif request.method == 'DELETE':
        note.delete()
        return JsonResponse({'message': 'Note deleted successfully'})
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)
