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

    const requester = this.participants.get(requesterId);
    const target = this.participants.get(targetId);
    if (!requester || !target) return false;

    if (requester.role === 'moderator' && target.role !== 'participant') {
      return false;
    }

    target.role = newRole;
    return true;
  }

  public transferHost(targetId: string, requesterId: string): boolean {
    if (this.hostId !== requesterId) return false;

    const requester = this.participants.get(requesterId);
    const target = this.participants.get(targetId);
    if (!requester || !target) return false;

    requester.role = 'participant';
    target.role = 'host';
    this.hostId = targetId;
    return true;
  }

  public validatePermission(userId: string, action: string): boolean {
    const participant = this.participants.get(userId);
    if (!participant) return false;

    const controlActions = ['play', 'pause', 'seek', 'change_video'];
    const adminActions = ['assign_role', 'remove_participant'];

    if (participant.role === 'host') {
      return true;
    }

    if (participant.role === 'moderator') {
      if (controlActions.includes(action)) return true;
      if (adminActions.includes(action)) return true;
    }

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
