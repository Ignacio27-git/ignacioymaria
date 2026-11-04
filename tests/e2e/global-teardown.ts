import { lifecycle } from "./lifecycle";

/** A file, not a returned function: it also runs when `globalSetup` threw. */
export default async function globalTeardown() {
  await lifecycle.end();
}
