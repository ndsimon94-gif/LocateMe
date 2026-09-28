"use client";

import { useState } from "react";
import { submitForm } from "@/lib/submit";
import styles from "./NewsletterForm.module.css";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  if (state === "done") return <p className={styles.done}>Thank you. We’ll write when there is something worth hearing.</p>;
  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        const ok = await submitForm("newsletter", new FormData(e.currentTarget));
        setState(ok ? "done" : "error");
      }}
    >
      <label htmlFor="nl-email" className="sr-only">
        Email address
      </label>
      <input id="nl-email" name="email" type="email" required placeholder="Your email" className="input" autoComplete="email" />
      <button type="submit" className={styles.btn} disabled={state === "sending"}>
        {state === "sending" ? "…" : "Subscribe"}
      </button>
      {state === "error" && <p className={styles.err}>Something went wrong. Please try again.</p>}
    </form>
  );
}
