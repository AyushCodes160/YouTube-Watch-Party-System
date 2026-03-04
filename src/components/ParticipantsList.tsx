import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Users, Crown, Shield, UserX, ChevronUp, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type Participant = Tables<'room_participants'>;

interface ParticipantsListProps {
  participants: Participant[];
  myRole: string;
  currentUserId: string;
  onAssignRole: (userId: string, role: 'moderator' | 'participant') => void;
  onRemove: (userId: string) => void;
}

const roleIcons: Record<string, typeof Crown> = {
  host: Crown,
  moderator: Shield,
};

const roleColors: Record<string, string> = {
  host: 'text-primary',
  moderator: 'text-accent',
  participant: 'text-muted-foreground',
};

export function ParticipantsList({
  participants,
  myRole,
  currentUserId,
  onAssignRole,
  onRemove,
}: ParticipantsListProps) {
  const sorted = [...participants].sort((a, b) => {
    const order = { host: 0, moderator: 1, participant: 2 };
    return (order[a.role] ?? 2) - (order[b.role] ?? 2);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Participants</span>
        <span className="text-xs text-muted-foreground ml-auto">{participants.length}</span>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {sorted.map((p) => {
            const Icon = roleIcons[p.role];
            const isMe = p.user_id === currentUserId;
            const canManage = (myRole === 'host' || myRole === 'moderator') && !isMe && p.role !== 'host';

            return (
              <div
                key={p.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 group"
              >
                <div className={`w-2 h-2 rounded-full bg-success animate-pulse-glow`} />
                <span className={`text-sm flex-1 truncate ${roleColors[p.role]}`}>
                  {p.username} {isMe && '(you)'}
                </span>
                {Icon && <Icon className={`w-3.5 h-3.5 ${roleColors[p.role]}`} />}

                {canManage && (
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    {p.role === 'participant' && (myRole === 'host' || myRole === 'moderator') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title="Promote to moderator"
                        onClick={() => onAssignRole(p.user_id, 'moderator')}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                    )}
                    {p.role === 'moderator' && myRole === 'host' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title="Demote to participant"
                        onClick={() => onAssignRole(p.user_id, 'participant')}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    )}
                    {myRole === 'host' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        title="Remove"
                        onClick={() => onRemove(p.user_id)}
                      >
                        <UserX className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
