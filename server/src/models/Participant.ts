export type Role = 'host' | 'moderator' | 'participant';

export class Participant {
  constructor(
    public id: string, // Corresponds to the Socket ID or User ID
    public username: string,
    public role: Role
  ) {}

  toJSON() {
    return {
      user_id: this.id,
      username: this.username,
      role: this.role,
      online: true // In this basic memory model, if they are in the participant list, they are online.
    };
  }
}
