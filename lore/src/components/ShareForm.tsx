"use client";

import { useState } from "react";
import { submitForm } from "@/lib/submit";
import styles from "./ShareForm.module.css";

const PATHS = [
  { value: "mine", label: "A story I carry", hint: "You tell it yourself." },
  { value: "storyteller", label: "Someone who tells stories", hint: "A family member, a neighbour, a friend." },
  { value: "community", label: "Someone in my community", hint: "An elder, or someone who keeps a tradition." },
  { value: "recording", label: "A recording that already exists", hint: "Video or audio you’ve made or been given." },
];

/**
 * A conversation more than a form. Only three things are required: a name,
 * a way to reply, and a few words about the story. Everything else helps,
 * and can be left for later.
 */
export function ShareForm() {
  const [path, setPath] = useState("mine");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const self = path === "mine";

  if (state === "done") {
    return (
      <div className={styles.done} role="status">
        <p className="display h2">Thank you.</p>
        <p className="lede">
          Someone from LORE will read this carefully and write back — usually within a couple of weeks. Nothing is recorded or published without the storyteller’s agreement.
        </p>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        const ok = await submitForm("share", new FormData(e.currentTarget));
        setState(ok ? "done" : "error");
      }}
    >
      <fieldset className={styles.step}>
        <legend className={styles.legend}>
          <span className={styles.num}>i.</span> What brings you here?
        </legend>
        <div className={styles.paths}>
          {PATHS.map((p) => (
            <label key={p.value} className="choice">
              <input type="radio" name="path" value={p.value} checked={path === p.value} onChange={() => setPath(p.value)} />
              <span>
                {p.label}
                <br />
                <small className="meta">{p.hint}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.step}>
        <legend className={styles.legend}>
          <span className={styles.num}>ii.</span> About you
        </legend>
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
        <div className={styles.row}>
          <label className="field">
            <span>Where you are</span>
            <input name="country" className="input" autoComplete="country-name" placeholder="Country, or region" />
          </label>
          <label className="field">
            <span>Your community or culture</span>
            <input name="community" className="input" placeholder="However you would describe it" />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.step}>
        <legend className={styles.legend}>
          <span className={styles.num}>iii.</span> About the story
        </legend>
        {!self && (
          <label className="field">
            <span>The storyteller’s name</span>
            <input name="storyteller" className="input" />
          </label>
        )}
        <div className={styles.row}>
          <label className="field">
            <span>The language it’s told in</span>
            <input name="language" className="input" placeholder="Or languages" />
          </label>
          <label className="field">
            <span>A title, if it has one</span>
            <input name="title" className="input" />
          </label>
        </div>
        <label className="field">
          <span>Tell us a little about the story</span>
          <small>A few sentences is plenty. You don’t need to tell the whole story here.</small>
          <textarea name="story" className="input" required />
        </label>
        {!self && (
          <label className="field">
            <span>How do you know this story, or this storyteller?</span>
            <textarea name="relationship" className="input" />
          </label>
        )}
        <label className="field">
          <span>Why would you like it to be shared?</span>
          <textarea name="why" className="input" />
        </label>
      </fieldset>

      <fieldset className={styles.step}>
        <legend className={styles.legend}>
          <span className={styles.num}>iv.</span> Care and permission
        </legend>
        <div className={styles.q}>
          <p className={styles.qText}>{self ? "Would you like this story to be shared publicly?" : "Does the storyteller want this story shared publicly?"}</p>
          <div className={styles.inline}>
            {["Yes", "Not sure yet", "Only in some ways", "I haven’t asked yet"].map((v, i) => (
              <label key={v} className="choice">
                <input type="radio" name="public" value={v} defaultChecked={i === 1} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </div>
        <div className={styles.q}>
          <p className={styles.qText}>Is there already a recording?</p>
          <div className={styles.inline}>
            {["Yes, video", "Yes, audio", "No, not yet"].map((v, i) => (
              <label key={v} className="choice">
                <input type="radio" name="recording" value={v} defaultChecked={path === "recording" ? i === 0 : i === 2} />
                <span>{v}</span>
              </label>
            ))}
          </div>
          {path === "recording" && <p className={styles.soon}>Uploads are coming soon. For now, tell us about the recording and we’ll arrange how to receive it.</p>}
        </div>
        <label className="field">
          <span>Anything we should know about cultural permissions or protocols?</span>
          <small>Who should be asked, when it may be told, who may hear it — anything that matters.</small>
          <textarea name="protocols" className="input" />
        </label>
      </fieldset>

      {/* Honeypot */}
      <label className="sr-only" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <div className={styles.submit}>
        <button type="submit" className="btn btn-solid" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send to LORE"}
        </button>
        <p className="meta">Sending this doesn’t commit anyone to anything. It simply starts a conversation.</p>
        {state === "error" && <p className={styles.err}>Something went wrong. Please try again, or write to us directly.</p>}
      </div>
    </form>
  );
}
