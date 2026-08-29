import { getEvents, getAvailableEmployees } from "@/app/actions/events";
import { getPersonalTasks } from "@/app/actions/personalTasks";
import EventsClient from "./EventsClient";
import { createClient } from "@/utils/supabase/server";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  let dbUser = null;
  if (authUser) {
    const { data } = await supabase.from('users').select('*').eq('auth_id', authUser.id).maybeSingle();
    
    if (!data) {
      // Fallback bằng email giống AuthContext
      const { data: fallback } = await supabase.from('users').select('*').eq('email', authUser.email).maybeSingle();
      dbUser = fallback;
    } else {
      dbUser = data;
    }
  }
  
  let personalTasks: any[] = [];
  if (dbUser) {
    personalTasks = await getPersonalTasks(dbUser.id);
  }

  const [events, employees] = await Promise.all([
    getEvents(),
    getAvailableEmployees()
  ]);

  return <EventsClient initialEvents={events || []} employees={employees || []} user={dbUser} initialPersonalTasks={personalTasks} />;
}
