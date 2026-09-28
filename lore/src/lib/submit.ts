/** Posts a form to one of the site's submission endpoints. */
export async function submitForm(kind: "share" | "contact" | "newsletter" | "support", data: FormData): Promise<boolean> {
  try {
    const res = await fetch(`/api/${kind}`, { method: "POST", body: data });
    return res.ok;
  } catch {
    return false;
  }
}
