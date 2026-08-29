import { getEventDetails, getAvailableEmployees } from "@/app/actions/events";
import EventDetailClient from "./EventDetailClient";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = await params;
  const eventId = unwrappedParams.id;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    redirect('/login');
  }

  let dbUser = null;
  const { data } = await supabase.from('users').select('*').eq('auth_id', authUser.id).maybeSingle();
  
  if (!data) {
    const { data: fallback } = await supabase.from('users').select('*').eq('email', authUser.email).maybeSingle();
    dbUser = fallback;
  } else {
    dbUser = data;
  }
  
  const [{ event, tasks }, employees] = await Promise.all([
    getEventDetails(eventId),
    getAvailableEmployees()
  ]);

  if (!event) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Không tìm thấy sự kiện!</div>;
  }

  return <EventDetailClient eventId={eventId} event={event} tasks={tasks || []} employees={employees || []} user={dbUser} />;
}
