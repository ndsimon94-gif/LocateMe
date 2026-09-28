import { handleIntake } from "@/lib/intake";

export async function POST(req: Request) {
  return handleIntake("support", req, ["name", "email"]);
}
