
import TicketDetailClient from "./TicketDetailClient";

export const instant = false;

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TicketDetailClient ticketId={id} />;
}
