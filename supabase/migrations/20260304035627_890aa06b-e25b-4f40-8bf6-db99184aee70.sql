
-- Create role enum
CREATE TYPE public.room_role AS ENUM ('host', 'moderator', 'participant');

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT,
  video_id TEXT,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  playback_time REAL NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room_participants table
CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  role room_role NOT NULL DEFAULT 'participant',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create room_messages table
CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Anyone authenticated can view rooms" ON public.rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can delete room" ON public.rooms
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_room_role(_user_id UUID, _room_id UUID, _role room_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE user_id = _user_id AND room_id = _room_id AND role = _role
  )
$$;

-- Function to check if user can control playback (host or moderator)
CREATE OR REPLACE FUNCTION public.can_control_playback(_user_id UUID, _room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE user_id = _user_id AND room_id = _room_id AND role IN ('host', 'moderator')
  )
$$;

-- Room update policy
CREATE POLICY "Controllers can update room" ON public.rooms
  FOR UPDATE TO authenticated USING (
    public.can_control_playback(auth.uid(), id)
  );

-- Room participants policies
CREATE POLICY "Participants visible to room members" ON public.room_participants
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.room_participants rp WHERE rp.room_id = room_participants.room_id AND rp.user_id = auth.uid())
  );

CREATE POLICY "Users can join rooms" ON public.room_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.room_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Host can remove participants" ON public.room_participants
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_participants.room_id AND r.host_id = auth.uid())
  );

CREATE POLICY "Host can update participant roles" ON public.room_participants
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.room_participants rp 
      WHERE rp.room_id = room_participants.room_id 
      AND rp.user_id = auth.uid() 
      AND rp.role IN ('host', 'moderator'))
  );

-- Messages policies
CREATE POLICY "Room members can view messages" ON public.room_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.room_participants rp WHERE rp.room_id = room_messages.room_id AND rp.user_id = auth.uid())
  );

CREATE POLICY "Room members can send messages" ON public.room_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.room_participants rp WHERE rp.room_id = room_messages.room_id AND rp.user_id = auth.uid())
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
