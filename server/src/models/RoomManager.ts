import { Room } from './Room';
import RoomMongo from './RoomMongo';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up empty rooms every 5 minutes from memory
    this.cleanupInterval = setInterval(() => this.cleanupEmptyRooms(), 5 * 60 * 1000);
  }

  // Load a room from MongoDB into the in-memory Map
  public async loadRoom(roomId: string): Promise<Room | undefined> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    try {
      const dbRoom = await RoomMongo.findOne({ roomId }).populate('participants.user', 'username');
      if (!dbRoom) return undefined;

      // Found in DB, recreate the OOP Room object
      const room = new Room(roomId, dbRoom.hostId.toString(), 'Host'); // We'll overwrite host username shortly
      
      // Override default state with DB state
      room.videoState = {
        state: dbRoom.videoState?.state as any || 'paused',
        currentTime: dbRoom.videoState?.currentTime || 0,
        videoId: dbRoom.videoState?.videoId || undefined,
        updatedAt: dbRoom.videoState?.updatedAt?.getTime() || Date.now()
      };
      
      // We clear the default participants to load from DB exactly
      room.participants.clear();
      
      if (dbRoom.participants) {
        dbRoom.participants.forEach((p: any) => {
           if (p.user) {
             room.addParticipant(p.user._id.toString(), p.user.username, p.role);
           }
        });
      }

      this.rooms.set(roomId, room);
      return room;
    } catch (err) {
      console.error('Error loading room from DB:', err);
      return undefined;
    }
  }

  public async createRoom(hostId: string, hostUsername: string, name: string, videoUrl?: string): Promise<Room> {
    const roomId = uuidv4().substring(0, 8); // Simple 8 character ID
    
    // 1. Create the DB record
    await RoomMongo.create({
      roomId,
      hostId,
      name,
      videoUrl,
      participants: [{
        user: hostId,
        role: 'host'
      }]
    });

    // 2. Create the OOP Memory Object
    const room = new Room(roomId, hostId, hostUsername);
    this.rooms.set(roomId, room);
    return room;
  }

  // Synchronous get for immediate WebSocket handler access
  // Callers MUST have called `loadRoom` beforehand if they expect it to exist
  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
    await RoomMongo.deleteOne({ roomId });
  }

  private async cleanupEmptyRooms() {
    for (const [id, room] of this.rooms.entries()) {
      if (room.isEmpty()) {
        try {
          // Sync final state to DB before purging from memory
          await RoomMongo.updateOne(
            { roomId: id }, 
            { $set: { videoState: room.videoState } }
          );
        } catch(e) { console.error('Error saving empty room state', e); }
        
        this.rooms.delete(id);
      }
    }
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
