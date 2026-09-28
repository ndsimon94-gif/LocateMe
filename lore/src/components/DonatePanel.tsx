"use client";

import { useState } from "react";
import { SITE } from "@/data/site";
import styles from "./DonatePanel.module.css";

const AMOUNTS = [25, 50, 100, 250];

export function DonatePanel() {
  const [freq, setFreq] = useState<"once" | "monthly">("once");
  const [amount, setAmount] = useState<number | "">(50);
  const href = `${SITE.donateUrl}?amount=${amount || ""}&frequency=${freq}`;
  return (
    <div className={styles.panel}>
      <div className={styles.freq} role="group" aria-label="How often">
        <button type="button" aria-pressed={freq === "once"} onClick={() => setFreq("once")}>
          Once
        </button>
        <button type="button" aria-pressed={freq === "monthly"} onClick={() => setFreq("monthly")}>
          Monthly
        </button>
      </div>
      <div className={styles.amounts} role="group" aria-label="Amount">
        {AMOUNTS.map((a) => (
          <button key={a} type="button" aria-pressed={amount === a} onClick={() => setAmount(a)}>
            ${a}
          </button>
        ))}
        <label className={styles.other}>
          <span className="sr-only">Another amount</span>
          <span aria-hidden="true">$</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Other"
            value={AMOUNTS.includes(amount as number) ? "" : amount}
            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
          />
        </label>
      </div>
      <a href={href} className="btn btn-solid">
        Give {amount ? `$${amount}` : ""} {freq === "monthly" ? "each month" : ""}
      </a>
      <p className="meta">Placeholder — online giving will connect to a payment provider before launch.</p>
    </div>
  );
}
