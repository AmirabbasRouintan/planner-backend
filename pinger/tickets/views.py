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
from django.db.models import Q
import json
import os
from datetime import datetime
from .models import Ticket, ConfigFile, V2RayConfig, UserProfile, PermanentNote, Task, Token, ChecklistItem, DailyGoal, EventTemplate


@csrf_exempt
def api_login(request):
    """API endpoint for user login"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({'error': 'Username and password are required'}, status=400)
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            # Create or get token for the user
            token, created = Token.objects.get_or_create(user=user)
            return JsonResponse({
                'success': True,
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'is_staff': user.is_staff
                }
            })
        else:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def api_register(request):
    """API endpoint for user registration"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return JsonResponse({'error': 'Username, email, and password are required'}, status=400)
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already exists'}, status=400)
        
        # Create user
        user = User.objects.create_user(username=username, email=email, password=password)
        
        # Create token for the user
        token = Token.objects.create(user=user)
        
        return JsonResponse({
            'success': True,
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff
            }
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def api_update_profile(request):
    """API endpoint for updating user profile"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    # Check if user is authenticated either via session or token
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        # Check for token authentication
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            # Validate token and get user
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass
    
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        data = json.loads(request.body)
        
        # Handle username update
        if 'username' in data:
            if User.objects.exclude(pk=user.pk).filter(username=data['username']).exists():
                return JsonResponse({'error': 'Username already taken'}, status=400)
            user.username = data['username']
        
        # Handle email update
        if 'email' in data:
            if User.objects.exclude(pk=user.pk).filter(email=data['email']).exists():
                return JsonResponse({'error': 'Email already taken'}, status=400)
            user.email = data['email']
            
        # Handle password change
        if all(key in data for key in ['current_password', 'new_password']):
            if not user.check_password(data['current_password']):
                return JsonResponse({'error': 'Current password is incorrect'}, status=400)
            user.set_password(data['new_password'])
        
        user.save()
        
        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def add_cors_headers(view_func):
    """Decorator to add CORS headers to API responses"""
    def wrapper(request, *args, **kwargs):
        # Debug: log incoming origin
        try:
            incoming_origin = request.META.get('HTTP_ORIGIN')
            print(f'DEBUG add_cors_headers - incoming Origin: {incoming_origin}')
        except Exception:
            incoming_origin = None

        response = view_func(request, *args, **kwargs)

        # Get the origin from the request or use the development URL as fallback
        origin = request.META.get('HTTP_ORIGIN', 'http://localhost:5173')
        print(f'DEBUG add_cors_headers - setting Access-Control-Allow-Origin to: {origin}')

        # Add CORS headers
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-Admin-Password, Authorization'
        response['Access-Control-Allow-Credentials'] = 'true'
        
        # Handle preflight OPTIONS requests
        if request.method == 'OPTIONS':
            response = JsonResponse({'status': 'ok'})
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, X-Admin-Password, Authorization'
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
            
        return response
    return wrapper

# Task API Endpoints
@csrf_exempt
@add_cors_headers
def task_api(request):
    """API endpoint for task CRUD operations"""
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    # Check if user is authenticated either via session or token
    user = None
    # Debug: log incoming auth header and cookies
    try:
        print('DEBUG task_api - HTTP_AUTHORIZATION:', request.META.get('HTTP_AUTHORIZATION'))
        print('DEBUG task_api - HTTP_COOKIE:', request.META.get('HTTP_COOKIE'))
    except Exception as _:
        pass
    if request.user.is_authenticated:
        user = request.user
    else:
        # Check for token authentication
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            # Validate token and get user
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass
    
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    # Get all tasks for the authenticated user
    if request.method == 'GET':
        tasks = Task.objects.filter(user=user)
        tasks_data = []
        
        for task in tasks:
            task_data = {
                'id': task.id,
                'title': task.title,
                'startDate': task.start_date.isoformat(),
                'endDate': task.end_date.isoformat(),
                'color': task.color,
                'isImportant': task.is_important,
                'createdAt': task.created_at.isoformat() if task.created_at else None,
                'updatedAt': task.updated_at.isoformat() if task.updated_at else None
            }
            if task.description:
                task_data['description'] = task.description
            tasks_data.append(task_data)
        
        # Update user's daily events JSON
        update_user_daily_events_json(user)
        
        return JsonResponse({'tasks': tasks_data})
    
    # Create a new task
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Create new task
            task = Task(
                user=user,
                title=data.get('title'),
                start_date=datetime.fromisoformat(data.get('startDate').replace('Z', '+00:00')),
                end_date=datetime.fromisoformat(data.get('endDate').replace('Z', '+00:00')),
                color=data.get('color', 'blue'),
                is_important=data.get('isImportant', False)
            )
            
            # Add description if provided
            if 'description' in data:
                task.description = data['description']
            
            task.save()
            
            # Update user's daily events JSON
            update_user_daily_events_json(user)
            
            task_data = {
                'id': task.id,
                'title': task.title,
                'startDate': task.start_date.isoformat(),
                'endDate': task.end_date.isoformat(),
                'color': task.color,
                'isImportant': task.is_important
            }
            if task.description:
                task_data['description'] = task.description
            
            return JsonResponse(task_data, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    # Invalid method
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@add_cors_headers
def task_detail_api(request, task_id):
    """API endpoint for individual task operations"""
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    # Check if user is authenticated either via session or token
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        # Check for token authentication
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            # Validate token and get user
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass
    
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        task = Task.objects.get(id=task_id, user=user)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found'}, status=404)
    
    # Get task details
    if request.method == 'GET':
        task_data = {
            'id': task.id,
            'title': task.title,
            'startDate': task.start_date.isoformat(),
            'endDate': task.end_date.isoformat(),
            'color': task.color,
            'isImportant': task.is_important
        }
        if task.description:
            task_data['description'] = task.description
        return JsonResponse(task_data)
    
    # Update task
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            if 'title' in data:
                task.title = data['title']
            if 'description' in data:
                task.description = data['description'] if data['description'] else None
            if 'startDate' in data:
                task.start_date = datetime.fromisoformat(data['startDate'].replace('Z', '+00:00'))
            if 'endDate' in data:
                task.end_date = datetime.fromisoformat(data['endDate'].replace('Z', '+00:00'))
            if 'color' in data:
                task.color = data['color']
            if 'isImportant' in data:
                task.is_important = data['isImportant']
            
            task.save()
            
            # Update user's daily events JSON
            update_user_daily_events_json(user)
            
            return JsonResponse({
                'id': task.id,
                'title': task.title,
                'startDate': task.start_date.isoformat(),
                'endDate': task.end_date.isoformat(),
                'color': task.color,
                'isImportant': task.is_important
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    # Delete task
    elif request.method == 'DELETE':
        task.delete()
        
        # Update user's daily events JSON
        update_user_daily_events_json(user)
        
        return JsonResponse({'status': 'success'})
    
    # Invalid method
    return JsonResponse({'error': 'Method not allowed'}, status=405)

def update_user_daily_events_json(user):
    """
    Update the user's daily events JSON in their profile.
    This function collects all tasks for the user and stores them as JSON.
    """
    try:
        # Get all tasks for the user
        tasks = Task.objects.filter(user=user)
        tasks_data = []
        
        for task in tasks:
            tasks_data.append({
                'id': task.id,
                'title': task.title,
                'startDate': task.start_date.isoformat(),
                'endDate': task.end_date.isoformat(),
                'color': task.color,
                'isImportant': task.is_important,
                'createdAt': task.created_at.isoformat() if task.created_at else None,
                'updatedAt': task.updated_at.isoformat() if task.updated_at else None
            })
        
        # Get or create user profile
        user_profile, created = UserProfile.objects.get_or_create(user=user)
        
        # Update the JSON field
        user_profile.daily_events_json = json.dumps(tasks_data, indent=2)
        user_profile.save()
        
    except Exception as e:
        # Log the error but don't fail the request
        print(f"Error updating user daily events JSON: {e}")
        pass


@csrf_exempt
@add_cors_headers
def user_daily_events_api(request):
    """API endpoint to get user's daily events as JSON"""
    if request.method == 'OPTIONS':
        return JsonResponse({'status': 'ok'})
    
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        # Get or create user profile
        user_profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # If there's no JSON data, create it
        if not user_profile.daily_events_json:
            update_user_daily_events_json(request.user)
        
        # Parse the JSON data
        events_data = json.loads(user_profile.daily_events_json) if user_profile.daily_events_json else []
        
        return JsonResponse({'events': events_data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


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
    if request.method == 'POST' or request.method == 'PATCH':
        try:
            # Get token from Authorization header
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if not auth_header.startswith('Token '):
                return JsonResponse({
                    'status': 'error',
                    'message': 'Authentication required'
                }, status=401)
            
            token_key = auth_header.split(' ')[1]
            
            # Validate token and get user
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Invalid token'
                }, status=401)

            # Get or create user profile
            user_profile, created = UserProfile.objects.get_or_create(user=user)

            if request.content_type == 'application/json':
                data = json.loads(request.body)
                if 'new_password' in data:
                    if not user.check_password(data['current_password']):
                        return JsonResponse({'error': 'Invalid current password'}, status=400)
                    user.set_password(data['new_password'])
                    user.save()
            else:
                if 'username' in request.POST:
                    user.username = request.POST['username']
                    user.save()

                if 'profile_picture' in request.FILES:
                    user_profile.profile_picture = request.FILES['profile_picture']
                    user_profile.save()

            return JsonResponse({
                'status': 'success',
                'message': 'Profile updated successfully',
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'email': user.email,
                    'name': user.first_name + ' ' + user.last_name if user.first_name or user.last_name else '',
                    'is_admin': user.is_staff,
                    'is_v2ray_admin': user.profile.is_v2ray_admin if hasattr(user, 'profile') else False,
                    'profile_picture': user_profile.profile_picture.url if user_profile.profile_picture else None
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


@csrf_exempt
@add_cors_headers
def v2ray_page(request):
    """V2Ray configuration page"""
    if request.method == 'GET':
        try:
            # Check if user has V2Ray access
            has_v2ray_access = True
            if hasattr(request.user, 'profile'):
                has_v2ray_access = request.user.profile.has_v2ray_access
            
            if not has_v2ray_access:
                return render(request, 'tickets/no_v2ray_access.html')
            
            # Get all v2ray configurations
            configs = V2RayConfig.objects.all()
            
            return render(request, 'tickets/v2ray_page.html', {
                'configs': configs,
                'has_v2ray_access': has_v2ray_access
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@add_cors_headers
def debug_v2ray(request):
    """Debug V2Ray configuration page"""
    if request.method == 'GET':
        try:
            # Check if user is admin
            is_admin = request.user.is_staff
            
            if not is_admin:
                return render(request, 'tickets/no_v2ray_access.html')
            
            # Get all v2ray configurations
            configs = V2RayConfig.objects.all()
            
            return render(request, 'tickets/debug_v2ray.html', {
                'configs': configs,
                'is_admin': is_admin
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@add_cors_headers
def api_permanent_notes(request):
    """
    API endpoint for managing permanent notes.
    GET: Retrieve all notes for the authenticated user
    POST: Create a new note for the authenticated user
    """
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    if request.method == 'GET':
        try:
            notes = PermanentNote.objects.filter(user=user)
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
                user=user,
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
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        note = PermanentNote.objects.get(id=note_id, user=user)
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

@csrf_exempt
@add_cors_headers
def checklist_api(request):
    """
    API endpoint for checklist items.
    GET: Retrieve all checklist items for the authenticated user
    POST: Create a new checklist item for the authenticated user
    """
    # Check if user is authenticated either via session or token
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        # Check for token authentication
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            # Validate token and get user
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    # Get all checklist items for the authenticated user
    if request.method == 'GET':
        checklist_items = ChecklistItem.objects.filter(user=user)
        items_data = []
        
        for item in checklist_items:
            items_data.append({
                'id': item.id,
                'text': item.text,
                'completed': item.completed,
                'created_at': item.created_at.isoformat() if item.created_at else None,
                'updated_at': item.updated_at.isoformat() if item.updated_at else None
            })
        
        return JsonResponse({'checklist_items': items_data})
    
    # Create a new checklist item
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Create new checklist item
            checklist_item = ChecklistItem(
                user=user,
                text=data.get('text', ''),
                completed=data.get('completed', False)
            )
            
            checklist_item.save()
            
            item_data = {
                'id': checklist_item.id,
                'text': checklist_item.text,
                'completed': checklist_item.completed,
                'created_at': checklist_item.created_at.isoformat() if checklist_item.created_at else None,
                'updated_at': checklist_item.updated_at.isoformat() if checklist_item.updated_at else None
            }
            
            return JsonResponse(item_data, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    # Invalid method
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@add_cors_headers
def checklist_item_api(request, item_id):
    """
    API endpoint for individual checklist item operations.
    GET: Retrieve a specific checklist item
    PUT: Update a specific checklist item
    DELETE: Delete a specific checklist item
    """
    # Check if user is authenticated either via session or token
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        # Check for token authentication
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            # Validate token and get user
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        checklist_item = ChecklistItem.objects.get(id=item_id, user=user)
    except ChecklistItem.DoesNotExist:
        return JsonResponse({'error': 'Checklist item not found'}, status=404)
    
    # Get checklist item details
    if request.method == 'GET':
        item_data = {
            'id': checklist_item.id,
            'text': checklist_item.text,
            'completed': checklist_item.completed,
            'created_at': checklist_item.created_at.isoformat() if checklist_item.created_at else None,
            'updated_at': checklist_item.updated_at.isoformat() if checklist_item.updated_at else None
        }
        return JsonResponse(item_data)
    
    # Update checklist item
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            if 'text' in data:
                checklist_item.text = data['text']
            if 'completed' in data:
                checklist_item.completed = data['completed']
            
            checklist_item.save()
            
            return JsonResponse({
                'id': checklist_item.id,
                'text': checklist_item.text,
                'completed': checklist_item.completed,
                'created_at': checklist_item.created_at.isoformat() if checklist_item.created_at else None,
                'updated_at': checklist_item.updated_at.isoformat() if checklist_item.updated_at else None
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    # Delete checklist item
    elif request.method == 'DELETE':
        checklist_item.delete()
        return JsonResponse({'status': 'success'})
    
    # Invalid method
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@add_cors_headers
def daily_goals_api(request):
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    if request.method == 'GET':
        goals = DailyGoal.objects.filter(user=user)
        data = [{'id': goal.id, 'text': goal.text, 'completed': goal.completed, 'date': goal.date.isoformat()} for goal in goals]
        return JsonResponse(data, safe=False)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            print(f"Received data for daily goal creation: {data}")  # Debug log
            
            # Validate required fields
            if 'text' not in data or not data['text'].strip():
                return JsonResponse({'error': 'Text field is required'}, status=400)
                
            if 'date' not in data or not data['date']:
                return JsonResponse({'error': 'Date field is required'}, status=400)
            
            # Validate date format
            try:
                from datetime import datetime
                datetime.strptime(data['date'], '%Y-%m-%d')
            except ValueError:
                return JsonResponse({'error': 'Invalid date format. Expected YYYY-MM-DD'}, status=400)
            
            # Extract target time from notes if present
            target_time = data.get('targetTime')
            if not target_time and data.get('notes'):
                # Try to extract from notes
                import re
                time_match = re.search(r'Target time: (\d+) minutes', data.get('notes', ''))
                if time_match:
                    target_time = int(time_match.group(1))
            
            # Create the goal with defaults for optional fields
            goal = DailyGoal.objects.create(
                user=user,
                text=data['text'].strip(),
                date=data['date'],
                completed=bool(data.get('completed', False)),
                priority=data.get('priority', 'medium') if data.get('priority') in dict(DailyGoal.PRIORITY_CHOICES) else 'medium',
                category=data.get('category', 'personal') or 'personal',
                color=data.get('color', 'blue') if data.get('color') in dict(DailyGoal.COLOR_CHOICES) else 'blue',
                notes=data.get('notes', '') or '',
                target_time=target_time
            )
            return JsonResponse({
                'id': goal.id, 
                'text': goal.text, 
                'completed': goal.completed, 
                'date': goal.date.isoformat(),
                'priority': goal.priority,
                'category': goal.category,
                'color': goal.color,
                'notes': goal.notes,
                'targetTime': goal.target_time
            }, status=201)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        except KeyError as e:
            return JsonResponse({'error': f'Missing required field: {str(e)}'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@add_cors_headers
def daily_goal_detail_api(request, goal_id):
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    try:
        goal = DailyGoal.objects.get(id=goal_id, user=user)
    except DailyGoal.DoesNotExist:
        return JsonResponse({'error': 'Goal not found'}, status=404)

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            # Extract target time from notes if present
            target_time = data.get('targetTime')
            if not target_time and data.get('notes'):
                import re
                time_match = re.search(r'Target time: (\d+) minutes', data.get('notes', ''))
                if time_match:
                    target_time = int(time_match.group(1))
            
            # Update all fields
            goal.text = data.get('text', goal.text)
            goal.completed = data.get('completed', goal.completed)
            goal.date = data.get('date', goal.date)
            goal.priority = data.get('priority', goal.priority) if data.get('priority') in dict(DailyGoal.PRIORITY_CHOICES) else goal.priority
            goal.category = data.get('category', goal.category)
            goal.color = data.get('color', goal.color) if data.get('color') in dict(DailyGoal.COLOR_CHOICES) else goal.color
            goal.notes = data.get('notes', goal.notes)
            goal.target_time = target_time if target_time is not None else goal.target_time
            goal.save()
            
            return JsonResponse({
                'id': goal.id,
                'text': goal.text,
                'completed': goal.completed,
                'date': goal.date.isoformat(),
                'priority': goal.priority,
                'category': goal.category,
                'color': goal.color,
                'notes': goal.notes,
                'targetTime': goal.target_time
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        goal.delete()
        return JsonResponse({'status': 'success'}, status=204)

@csrf_exempt
@add_cors_headers
def event_templates_api(request):
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    if request.method == 'GET':
        templates = EventTemplate.objects.filter(user=user)
        data = [{'id': t.id, 'name': t.name, 'title': t.title, 'color': t.color} for t in templates]
        return JsonResponse(data, safe=False)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            template = EventTemplate.objects.create(
                user=user,
                name=data['name'],
                title=data['title'],
                color=data.get('color', 'blue')
            )
            return JsonResponse({'id': template.id, 'name': template.name, 'title': template.title, 'color': template.color}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@add_cors_headers
def event_template_detail_api(request, template_id):
    user = None
    if request.user.is_authenticated:
        user = request.user
    else:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                user = token.user
            except Token.DoesNotExist:
                pass

    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    try:
        template = EventTemplate.objects.get(id=template_id, user=user)
    except EventTemplate.DoesNotExist:
        return JsonResponse({'error': 'Template not found'}, status=404)

    if request.method == 'DELETE':
        template.delete()
        return JsonResponse({'status': 'success'}, status=204)

    # Allow updating an existing template via PUT
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            template.name = data.get('name', template.name)
            template.title = data.get('title', template.title)
            template.color = data.get('color', template.color)
            template.save()
            return JsonResponse({'id': template.id, 'name': template.name, 'title': template.title, 'color': template.color})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)