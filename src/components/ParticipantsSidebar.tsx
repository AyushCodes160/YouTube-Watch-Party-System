import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Crown, Shield, User, MoreVertical, UserMinus, ChevronUp, ChevronDown, Wifi, WifiOff } from 'lucide-react';

interface Participant {
  user_id: string;
  username: string;
  role: 'host' | 'moderator' | 'participant';
  online: boolean;
}

interface ParticipantsSidebarProps {
  participants: Participant[];
  myRole: 'host' | 'moderator' | 'participant' | null;
  currentUserId: string | undefined;
  onUpdateRole: (userId: string, role: 'moderator' | 'participant') => void;
  onRemoveParticipant: (userId: string) => void;
}

const roleIcon = (role: string) => {
  if (role === 'host') return <Crown className="h-3.5 w-3.5 text-warning" />;
  if (role === 'moderator') return <Shield className="h-3.5 w-3.5 text-accent" />;
  return <User className="h-3.5 w-3.5 text-muted-foreground" />;
};

const roleBadge = (role: string) => {
  if (role === 'host') return 'default';
  if (role === 'moderator') return 'secondary';
  return 'outline';
};

export function ParticipantsSidebar({
  participants,
  myRole,
  currentUserId,
  onUpdateRole,
  onRemoveParticipant,
}: ParticipantsSidebarProps) {
  const sorted = [...participants].sort((a, b) => {
    const order = { host: 0, moderator: 1, participant: 2 };
    return order[a.role] - order[b.role];
  });

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h3 className="text-sm font-semibold">Participants</h3>
        <Badge variant="outline" className="text-xs">
          {participants.filter((p) => p.online).length}/{participants.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-1">
          {sorted.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium uppercase">
                    {p.username.slice(0, 2)}
                  </div>
                  {p.online ? (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
                  ) : (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-muted-foreground/40" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">
                    {p.username}
                    {p.user_id === currentUserId && (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {roleIcon(p.role)} {p.role}
                  </span>
                </div>
              </div>

              {myRole === 'host' && p.user_id !== currentUserId && p.role !== 'host' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {p.role === 'participant' ? (
                      <DropdownMenuItem onClick={() => onUpdateRole(p.user_id, 'moderator')}>
                        <ChevronUp className="mr-2 h-4 w-4" /> Promote to Moderator
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onUpdateRole(p.user_id, 'participant')}>
                        <ChevronDown className="mr-2 h-4 w-4" /> Demote to Participant
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-destructive" onClick={() => onRemoveParticipant(p.user_id)}>
                      <UserMinus className="mr-2 h-4 w-4" /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
