import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Sparkles } from "lucide-react";
import ixiFlowerProfilePic from "@/assets/ixi_flower.jpg";
import freaklessProfilePic from '@/assets/freakless.jpg';

interface ProfileCardProps {
  username: string;
  imageUrl?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ username, imageUrl }) => {
  const initials = React.useMemo(() => username.slice(0, 2).toUpperCase(), [username]);
  return (
    <Card className="relative overflow-hidden border border-border bg-[var(--calendar-date-bg)] transition-all duration-200 hover:shadow-lg hover:-translate-y-[1px]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      <CardHeader className="py-4 px-5">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 opacity-80" /> Team Member
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 ring-2 ring-border">
            {imageUrl ? (
              <AvatarImage src={imageUrl} alt={username} />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold truncate">{username}</div>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">Active</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Core Contributor</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="text-[10px]" variant="outline">Planner</Badge>
              <Badge className="text-[10px]" variant="outline">Calendar</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="h-8">View</Button>
            <Button size="sm" variant="outline" className="h-8">Message</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const Teams: React.FC = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" /> Team
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Your core collaborators at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProfileCard username="ixi_flower" imageUrl={ixiFlowerProfilePic} />
        <ProfileCard username="freakless" imageUrl={freaklessProfilePic} />
      </div>
    </div>
  );
};

export default Teams;


