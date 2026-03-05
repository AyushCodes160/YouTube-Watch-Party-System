export type Role = 'host' | 'moderator' | 'participant';

export class Participant {
  public online: boolean = true;

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
      online: this.online
    };
  }
}
