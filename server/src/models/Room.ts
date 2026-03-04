import { Participant, Role } from './Participant';

export interface VideoState {
  state: 'playing' | 'paused' | 'buffering';
  currentTime: number;
  videoId?: string;
  updatedAt: number;
}

export class Room {
  public id: string;
  public hostId: string;
  public participants: Map<string, Participant>;
  public videoState: VideoState;
  public createdAt: Date;

  constructor(id: string, hostId: string, hostUsername: string) {
    this.id = id;
    this.hostId = hostId;
    this.participants = new Map();
    this.videoState = {
      state: 'paused',
      currentTime: 0,
      updatedAt: Date.now(),
    };
    this.createdAt = new Date();

    // The creator becomes the host
    this.addParticipant(hostId, hostUsername, 'host');
  }

  public addParticipant(id: string, username: string, role: Role = 'participant'): Participant {
    const participant = new Participant(id, username, role);
    this.participants.set(id, participant);
    return participant;
  }

  public removeParticipant(id: string): void {
    this.participants.delete(id);
  }

  public assignRole(targetId: string, newRole: Role, requesterId: string): boolean {
    if (!this.validatePermission(requesterId, 'assign_role')) {
      return false;
    }

    const participant = this.participants.get(targetId);
    if (participant) {
      participant.role = newRole;
      return true;
    }
    return false;
  }

  public validatePermission(userId: string, action: string): boolean {
    const participant = this.participants.get(userId);
    if (!participant) return false;

    const controlActions = ['play', 'pause', 'seek', 'change_video'];
    const adminActions = ['assign_role', 'remove_participant'];

    if (participant.role === 'host') {
      return true; // Host can do everything
    }

    if (participant.role === 'moderator') {
      if (controlActions.includes(action)) return true;
      if (adminActions.includes(action)) return false;
    }

    // Regular participant can't do any of these actions
    if (participant.role === 'participant') {
      if (controlActions.includes(action) || adminActions.includes(action)) {
        return false;
      }
    }

    return false;
  }

  public updateVideoState(newState: Partial<VideoState>): void {
    this.videoState = {
      ...this.videoState,
      ...newState,
      updatedAt: Date.now(),
    };
  }

  public getParticipantList() {
    return Array.from(this.participants.values()).map(p => p.toJSON());
  }

  public isEmpty(): boolean {
    return this.participants.size === 0;
  }
}
