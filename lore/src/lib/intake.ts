/**
 * Shared intake for every form on the site. For now submissions are
 * validated and logged on the server. Connect a destination here — email,
 * a CRM, an Airtable/Notion base, or the archive's own database — and every
 * form picks it up.
 */
export async function handleIntake(kind: string, req: Request, required: string[]) {
  let data: FormData;
  try {
    data = await req.formData();
  } catch {
    return Response.json({ ok: false, error: "Could not read the form." }, { status: 400 });
  }
  // Honeypot: real people never fill this in.
  if (data.get("website")) return Response.json({ ok: true });

  const record: Record<string, string> = {};
  for (const [k, v] of data.entries()) if (typeof v === "string") record[k] = v.slice(0, 5000);

  const missing = required.filter((f) => !record[f]?.trim());
  if (missing.length) return Response.json({ ok: false, missing }, { status: 422 });
  if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
    return Response.json({ ok: false, missing: ["email"] }, { status: 422 });
  }

  // TODO: deliver `record` somewhere durable.
  console.info(`[lore:${kind}]`, { receivedAt: new Date().toISOString(), fields: Object.keys(record) });
  return Response.json({ ok: true });
}
