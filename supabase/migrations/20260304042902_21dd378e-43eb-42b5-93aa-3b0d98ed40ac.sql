
-- Create enum for room participant roles
CREATE TYPE public.room_role AS ENUM ('host', 'moderator', 'participant');

-- Create enum for app-level roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Watch Party',
  video_url TEXT,
  video_state JSONB NOT NULL DEFAULT '{"state": "paused", "currentTime": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- Room participants table
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role room_role NOT NULL DEFAULT 'participant',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

-- App-level user roles (per security guidelines - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function for room role checks
CREATE OR REPLACE FUNCTION public.get_room_role(_user_id UUID, _room_id UUID)
RETURNS room_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.room_participants
  WHERE user_id = _user_id AND room_id = _room_id
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Authenticated users can view rooms they participate in"
  ON public.rooms FOR SELECT TO authenticated
  USING (
    host_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.room_participants WHERE room_id = rooms.id AND user_id = auth.uid())
  );
CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Only host can update room"
  ON public.rooms FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);
CREATE POLICY "Only host can delete room"
  ON public.rooms FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

-- Room participants policies
CREATE POLICY "Participants can view room members"
  ON public.room_participants FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.room_participants rp WHERE rp.room_id = room_participants.room_id AND rp.user_id = auth.uid())
  );
CREATE POLICY "Authenticated users can join rooms"
  ON public.room_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Host can update participant roles"
  ON public.room_participants FOR UPDATE TO authenticated
  USING (
    public.get_room_role(auth.uid(), room_id) = 'host'
  );
CREATE POLICY "Host can remove participants or user can leave"
  ON public.room_participants FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    public.get_room_role(auth.uid(), room_id) = 'host'
  );

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
