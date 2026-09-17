-- Tạo bảng Sự kiện
CREATE TABLE public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_date timestamptz,
  end_date timestamptz,
  status text DEFAULT 'Đang diễn ra',
  is_closed_by_manager boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy cho events (Cho phép Admin và Nhân sự thao tác)
CREATE POLICY "Cho phép tất cả thao tác từ authenticated trên events" ON public.events
  FOR ALL USING (auth.role() = 'authenticated');

-- Tạo bảng Task (Checklist)
CREATE TABLE public.event_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  task_index integer,
  task_name text NOT NULL,
  start_date timestamptz,
  end_date timestamptz,
  assignee_id text REFERENCES public.users(id) ON DELETE SET NULL, -- Tham chiếu tới bảng users hiện tại của VicEdu
  assignee_status text DEFAULT 'Chờ tiếp nhận', 
  manager_approval text DEFAULT 'Chờ duyệt', 
  notes jsonb DEFAULT '[]'::jsonb, 
  attachment_url text, 
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho event_tasks
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;

-- Policy cho event_tasks
CREATE POLICY "Cho phép tất cả thao tác từ authenticated trên event_tasks" ON public.event_tasks
  FOR ALL USING (auth.role() = 'authenticated');
