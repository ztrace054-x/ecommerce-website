"use client";

import Link from "next/link";
import { useState } from "react";

const slides = [
  {
    eyebrow: "BANGLADESH-FIRST DIGITAL STORE",
    title: "নিরাপদ ও সহজ ডিজিটাল পণ্য",
    description:
      "ডলার কার্ড ছাড়াই কিনুন। বিকাশে টাকা পাঠান, TrxID দিন, আমরা নিজে যাচাই করে পণ্য পৌঁছে দেব।",
  },
  {
    eyebrow: "PREMIUM AI TOOLS",
    title: "আপনার কাজের জন্য সঠিক AI প্ল্যান",
    description:
      "আপনার প্রয়োজনের প্ল্যান বেছে নিন। সুবিধা ও মূল্য আগে দেখুন, তারপর সহজে অর্ডার করুন।",
  },
  {
    eyebrow: "PAY LOCALLY. USE DIGITALLY.",
    title: "পেমেন্ট থেকে ডেলিভারি—সব ধাপে স্বচ্ছতা",
    description:
      "বিকাশে পেমেন্ট করুন, TrxID জমা দিন। আমরা লেনদেন যাচাই করে অর্ডারের আপডেট জানাব।",
  },
];

export function HomeHero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];

  function handleIndicatorKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const nextIndex =
      (index + (event.key === "ArrowDown" ? 1 : slides.length - 1)) %
      slides.length;
    setActiveSlide(nextIndex);
    document.getElementById("vexora-slide-" + nextIndex)?.focus();
  }

  return (
    <section className="vexora-hero" aria-label="VEXORA introduction">
      <span className="vexora-vertical-word" aria-hidden="true">
        VEXORA
      </span>

      <div className="vexora-container vexora-hero-grid">
        <div className="vexora-hero-copy" aria-live="polite">
          <p className="vexora-hero-eyebrow">
            <span className="vexora-live-dot" />
            {slide.eyebrow}
          </p>
          <h1>
            <span className="vexora-hero-wordmark">VEXORA</span>
            <span className="vexora-hero-title">{slide.title}</span>
          </h1>
          <p className="vexora-hero-description">{slide.description}</p>

          <div className="vexora-hero-actions">
            <Link href="#plans" className="vexora-button vexora-button-primary">
              অর্ডার করুন <span className="vexora-button-en">/ Order now</span>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/track-order"
              className="vexora-button vexora-button-secondary"
            >
              ট্র্যাক করুন <span className="vexora-button-en">/ Track order</span>
            </Link>
          </div>

          <p className="vexora-hero-note">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m9.5 15 1.7 1.7 3.6-3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            কোনো অ্যাকাউন্টের পাসওয়ার্ড দিতে হবে না
          </p>
        </div>

        <div className="vexora-hero-visual" aria-hidden="true">
          <div className="vexora-orb-scene">
            <div className="vexora-orb-halo" />
            <div className="vexora-liquid-orb">
              <svg viewBox="0 0 480 480" role="presentation">
                <defs>
                  <linearGradient id="vexora-orb-line" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#d8fbff" stopOpacity=".9" />
                    <stop offset=".48" stopColor="#22d3ee" stopOpacity=".52" />
                    <stop offset="1" stopColor="#e8a87c" stopOpacity=".72" />
                  </linearGradient>
                  <radialGradient id="vexora-orb-shine" cx=".28" cy=".2" r=".8">
                    <stop offset="0" stopColor="#ffffff" stopOpacity=".76" />
                    <stop offset=".25" stopColor="#b5f7ff" stopOpacity=".18" />
                    <stop offset="1" stopColor="#0b0f14" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="240" cy="240" r="202" fill="url(#vexora-orb-shine)" />
                <path
                  d="M75 226c39-102 111-159 193-153 87 7 138 66 145 132 7 68-41 123-101 146-68 26-127 9-171-24-43-32-87-49-66-101Z"
                  fill="none"
                  stroke="url(#vexora-orb-line)"
                  strokeWidth="2.2"
                  opacity=".8"
                />
                <path
                  d="M111 139c52-53 135-76 204-43 69 33 101 98 83 157-17 56-73 86-132 79-63-7-93-47-132-71-44-27-68-78-23-122Z"
                  fill="none"
                  stroke="#f2fbff"
                  strokeWidth="1.1"
                  opacity=".38"
                />
                <path
                  d="M129 300c34 48 91 80 150 69 58-11 92-55 103-100"
                  fill="none"
                  stroke="#e8a87c"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity=".72"
                />
                <path
                  d="M160 83c28-17 61-26 95-26"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity=".5"
                />
                <circle cx="153" cy="118" r="5" fill="#ffffff" opacity=".8" />
                <circle cx="350" cy="315" r="4" fill="#e8a87c" opacity=".9" />
              </svg>
            </div>
            <div className="vexora-orb-reflection" />
            <span className="vexora-orb-caption">DIGITAL, MADE SIMPLE</span>
          </div>
        </div>
      </div>

      <div className="vexora-slide-indicators" aria-label="Hero slides">
        {slides.map((item, index) => (
          <button
            key={item.eyebrow}
            id={"vexora-slide-" + index}
            type="button"
            aria-label={"Show slide " + (index + 1)}
            aria-pressed={activeSlide === index}
            onClick={() => setActiveSlide(index)}
            onKeyDown={(event) => handleIndicatorKeyDown(event, index)}
          />
        ))}
      </div>
    </section>
  );
}
