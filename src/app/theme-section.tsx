import { ThemeToggle } from "@/components/ui/theme-toggle";
import { readThemePreference } from "@/server/theme/read-preference";

/** Reads the stored preference on the server and hands it to the toggle. */
export async function ThemeSection() {
  return <ThemeToggle value={await readThemePreference()} />;
}
