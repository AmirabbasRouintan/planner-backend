from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data

    try:
        # Handle profile picture upload
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']
            user.save()
            return Response({
                'message': 'Profile picture updated successfully',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'profile_picture': request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None,
                    'is_staff': user.is_staff
                }
            })

        # Handle username update
        if 'username' in data:
            if User.objects.exclude(pk=user.pk).filter(username=data['username']).exists():
                return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)
            user.username = data['username']
            user.save()

        # Handle password change
        if all(key in data for key in ['current_password', 'new_password']):
            if not user.check_password(data['current_password']):
                return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(data['new_password'])
            user.save()

        return Response({'message': 'Profile updated successfully'})

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
