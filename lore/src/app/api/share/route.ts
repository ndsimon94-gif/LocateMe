import { handleIntake } from "@/lib/intake";

export async function POST(req: Request) {
  return handleIntake("share", req, ["name", "email", "story"]);
}
