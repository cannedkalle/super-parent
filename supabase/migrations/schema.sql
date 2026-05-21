-- Create registration_status enum
CREATE TYPE registration_status AS ENUM ('researching', 'waiting_to_register', 'waitlisted', 'booked');

-- Create profiles table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create calendar_settings table
CREATE TABLE IF NOT EXISTS public.calendar_settings (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    summer_week_start DATE NOT NULL DEFAULT '2026-06-08',
    number_of_weeks INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on calendar_settings
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own calendar settings"
    ON public.calendar_settings FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Allow users to insert their own calendar settings"
    ON public.calendar_settings FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Allow users to update their own calendar settings"
    ON public.calendar_settings FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

-- Create children table
CREATE TABLE IF NOT EXISTS public.children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- Hex code or CSS color name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on children
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own children"
    ON public.children FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Allow users to insert their own children"
    ON public.children FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Allow users to update their own children"
    ON public.children FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Allow users to delete their own children"
    ON public.children FOR DELETE
    USING (auth.uid() = profile_id);

-- Create camps table
CREATE TABLE IF NOT EXISTS public.camps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means global system-provided camp, non-NULL means custom user camp
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    address TEXT NOT NULL,
    start_time TEXT NOT NULL, -- e.g., '9:00 AM'
    end_time TEXT NOT NULL,   -- e.g., '3:00 PM'
    registration_open_date DATE,
    payment_due_date DATE,
    refund_deadline_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on camps
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;

-- Users can view system-provided camps (profile_id is NULL) or their own custom camps
CREATE POLICY "Allow users to view camps"
    ON public.camps FOR SELECT
    USING (profile_id IS NULL OR auth.uid() = profile_id);

CREATE POLICY "Allow users to insert their own camps"
    ON public.camps FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Allow users to update their own camps"
    ON public.camps FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Allow users to delete their own camps"
    ON public.camps FOR DELETE
    USING (auth.uid() = profile_id);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
    summer_week_start DATE NOT NULL, -- Represents the Monday of the camp week (e.g. '2026-06-08')
    status registration_status NOT NULL DEFAULT 'researching',
    notes TEXT,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT bookings_child_week_unique UNIQUE(child_id, summer_week_start)
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own bookings"
    ON public.bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE public.children.id = public.bookings.child_id
            AND public.children.profile_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to insert bookings for their children"
    ON public.bookings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE public.children.id = child_id
            AND public.children.profile_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to update their own bookings"
    ON public.bookings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE public.children.id = public.bookings.child_id
            AND public.children.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE public.children.id = child_id
            AND public.children.profile_id = auth.uid()
        )
    );

CREATE POLICY "Allow users to delete their own bookings"
    ON public.bookings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE public.children.id = public.bookings.child_id
            AND public.children.profile_id = auth.uid()
        )
    );

-- Create optimization indexes
CREATE INDEX IF NOT EXISTS idx_children_profile ON public.children(profile_id);
CREATE INDEX IF NOT EXISTS idx_camps_profile ON public.camps(profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_child ON public.bookings(child_id);
CREATE INDEX IF NOT EXISTS idx_bookings_camp ON public.bookings(camp_id);
CREATE INDEX IF NOT EXISTS idx_bookings_child_week ON public.bookings(child_id, summer_week_start);

-- Automatically create profile row and calendar settings when user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);
    
    INSERT INTO public.calendar_settings (profile_id, summer_week_start, number_of_weeks)
    VALUES (new.id, '2026-06-08', 10);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
