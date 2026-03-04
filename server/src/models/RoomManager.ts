import { Room } from './Room';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up empty rooms every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupEmptyRooms(), 5 * 60 * 1000);
  }

  public createRoom(hostId: string, hostUsername: string): Room {
    const roomId = uuidv4().substring(0, 8); // Simple 8 character ID
    const room = new Room(roomId, hostId, hostUsername);
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  private cleanupEmptyRooms(): void {
    for (const [id, room] of this.rooms.entries()) {
      if (room.isEmpty()) {
        this.rooms.delete(id);
      }
    }
  }

  // Handle teardown if needed
  public destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
