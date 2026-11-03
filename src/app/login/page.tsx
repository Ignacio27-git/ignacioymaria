import { Masthead } from "@/components/ui/masthead";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <Masthead title="Entrar" as="h1" />
      <LoginForm />
    </main>
  );
}
