"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { submitForm } from "@/lib/submit";
import styles from "./ShareForm.module.css";

const TOPICS = [
  { value: "story", label: "A story in the archive — corrections, context, permissions or removal" },
  { value: "share", label: "Sharing a story" },
  { value: "supporter", label: "Becoming a supporter" },
  { value: "partnership", label: "Partnerships and grants" },
  { value: "press", label: "Press" },
  { value: "other", label: "Something else" },
];

export function ContactForm({ storyTitles }: { storyTitles: Record<string, string> }) {
  const sp = useSearchParams();
  const about = sp.get("about") ?? "";
  const initialTopic = about ? "story" : (sp.get("topic") ?? "other");
  const [topic, setTopic] = useState(TOPICS.some((t) => t.value === initialTopic) ? initialTopic : "other");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (state === "done")
    return (
      <div className={styles.done} role="status">
        <p className="display h2">Thank you.</p>
        <p className="lede">A person will read this and reply. If it concerns a story in the archive, we’ll respond as a priority.</p>
      </div>
    );

  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        const ok = await submitForm("contact", new FormData(e.currentTarget));
        setState(ok ? "done" : "error");
      }}
    >
      <fieldset className={styles.step}>
        <label className="field">
          <span>What is this about?</span>
          <select name="topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {topic === "story" && (
          <label className="field">
            <span>Which story?</span>
            <select name="story" className="input" defaultValue={about}>
              <option value="">Choose a story</option>
              {Object.entries(storyTitles).map(([slug, title]) => (
                <option key={slug} value={slug}>
                  {title}
                </option>
              ))}
            </select>
            <small>If you are the storyteller, a family member or a community representative, please tell us below.</small>
          </label>
        )}
        <div className={styles.row}>
          <label className="field">
            <span>Your name</span>
            <input name="name" className="input" required autoComplete="name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" className="input" required autoComplete="email" />
          </label>
        </div>
        <label className="field">
          <span>Your message</span>
          <textarea name="message" className="input" required />
        </label>
        <label className="sr-only" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </fieldset>
      <div className={styles.submit}>
        <button type="submit" className="btn btn-solid" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send"}
        </button>
        {state === "error" && <p className={styles.err}>Something went wrong. Please try again.</p>}
      </div>
    </form>
  );
}
