import { GuestInvite } from "@/components/GuestInvite";

export const metadata = { title: "You're invited · shaadi os" };

export default async function InvitePage({ params }: { params: Promise<{ payload: string }> }) {
  const { payload } = await params;
  return <GuestInvite payload={payload} />;
}
