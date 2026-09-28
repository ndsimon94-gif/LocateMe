import { handleIntake } from "@/lib/intake";

export async function POST(req: Request) {
  return handleIntake("newsletter", req, ["email"]);
}
