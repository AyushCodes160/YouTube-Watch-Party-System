import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
    },
    videoState: {
      state: {
        type: String,
        enum: ['playing', 'paused', 'buffering'],
        default: 'paused',
      },
      currentTime: {
        type: Number,
        default: 0,
      },
      videoId: {
        type: String,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['host', 'moderator', 'participant'],
          default: 'participant',
        },
      },
    ],
  },
  { timestamps: true }
);

const RoomMongo = mongoose.model('Room', RoomSchema);

export default RoomMongo;
