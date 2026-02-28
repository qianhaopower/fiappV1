import { redirect } from "next/navigation";

export default function Home() {
  // Root always delegates to canonical routing.
  // decideRoute fetches /api/me and sends unauthed users to /auth.
  redirect("/decideRoute");
}
