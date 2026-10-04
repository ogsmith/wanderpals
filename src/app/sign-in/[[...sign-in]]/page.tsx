import { SignIn } from "@clerk/nextjs";
import AuthShell from "@/components/AuthShell";

export default function Page() {
  return (
    <AuthShell title="Welcome back! Your pal missed you.">
      <SignIn />
    </AuthShell>
  );
}
