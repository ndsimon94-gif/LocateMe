import { handleIntake } from "@/lib/intake";

export async function POST(req: Request) {
  return handleIntake("contact", req, ["name", "email", "message"]);
}
