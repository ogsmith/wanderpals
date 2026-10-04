import { SignUp } from "@clerk/nextjs";
import AuthShell from "@/components/AuthShell";

export default function Page() {
  return (
    <AuthShell title="Let's make a little you.">
      <SignUp />
    </AuthShell>
  );
}
