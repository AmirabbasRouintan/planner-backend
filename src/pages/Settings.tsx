import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/backend";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Settings: React.FC = () => {
  const { user, token, updateUser } = useAuth();
  const [username, setUsername] = React.useState(user?.username || "");
  const [profilePicture, setProfilePicture] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const getMediaUrl = React.useCallback((path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    // Remove any leading slashes from the path
    const cleanPath = path.replace(/^\/+/, '');
    return `${baseUrl}/${cleanPath}`;
  }, []);

  const getProfileImageUrl = React.useCallback(() => {
    if (imagePreview) return imagePreview;
    if (user?.profile_picture) {
      const mediaUrl = getMediaUrl(user.profile_picture);
      return mediaUrl || '/default-avatar.png';
    }
    return "/default-avatar.png";
  }, [imagePreview, user?.profile_picture, getMediaUrl]);



  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicture(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleProfileUpdate = async () => {
    const formData = new FormData();
    formData.append("username", username);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        updateUser(data.user);
        alert("Profile updated successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to update profile: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating profile.");
    }
  };

  const handlePictureUpload = async () => {
    if (!profilePicture) {
      alert("Please select a picture to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("profile_picture", profilePicture);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user || data.profile_picture_url) {
          // Ensure we have the complete user data
          const updatedUser = {
            ...user,
            ...(data.user || {}),
            profile_picture: data.profile_picture_url || data.user?.profile_picture
          };
          updateUser(updatedUser);
          alert("Picture uploaded successfully!");
          // Clear the file input and preview
          setProfilePicture(null);
          setImagePreview(null);
          // Reset the file input element
          const fileInput = document.getElementById('picture') as HTMLInputElement;
          if (fileInput) fileInput.value = '';

        } else {
          alert("Picture uploaded but user data was not returned.");
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to upload picture: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error uploading picture:", error);
      alert("An error occurred while uploading the picture.");
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        alert("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const errorData = await response.json();
        alert(`Failed to change password: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      alert("An error occurred while changing the password.");
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your account settings and preferences.</p>

        <div className="space-y-8">
          <Card className="bg-[var(--calendar-date-bg)] p-5">
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your profile picture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <img
                  src={getProfileImageUrl()}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-primary/50"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/default-avatar.png";
                  }}
                />
                <div className="flex-1 w-full">
                  <Label htmlFor="picture" className="sr-only">Update Picture</Label>
                  <Input id="picture" type="file" onChange={handlePictureChange} className="w-full" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handlePictureUpload}>Upload Picture</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--calendar-date-bg)] p-5">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your username.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleProfileUpdate}>Update Profile</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--calendar-date-bg)] p-5">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password. Make sure it is a strong one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handlePasswordChange}>Change Password</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;