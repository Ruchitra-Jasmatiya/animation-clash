import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import pista from "../assets/images/pista.png";
import bucket from "../assets/images/bucket.png";

import "./PistachioAnimation.css";

gsap.registerPlugin(ScrollTrigger);

const PistachioAnimation = () => {
  const sectionRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const pieces = gsap.utils.toArray(".falling-pista");

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=1800",
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      // Bring in the bucket
      timeline.fromTo(
        ".pista-bucket",
        { scale: 0.85, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1 }
      );

      // Drop each pistachio into the bucket
      pieces.forEach((piece, index) => {
        const positions = [
          { x: -100, endX: -35 },
          { x: 70, endX: 25 },
          { x: -45, endX: 10 },
          { x: 110, endX: -20 },
          { x: 15, endX: 0 },
          { x: -120, endX: 30 },
          { x: 80, endX: -10 },
          { x: -20, endX: 15 },
        ];

        const position = positions[index];

        timeline.fromTo(
          piece,
          {
            x: position.x,
            y: -220,
            rotation: -90,
            opacity: 0,
          },
          {
            x: position.endX,
            y: 190,
            rotation: 360,
            opacity: 1,
            duration: 1,
            ease: "power1.in",
          },
          0.8 + index * 0.45
        );

        // Hide the pistachio as it enters the bucket
        timeline.to(
          piece,
          {
            opacity: 0,
            scale: 0.5,
            duration: 0.15,
          },
          1.5 + index * 0.45
        );
      });

      // Reveal the final message
      timeline.fromTo(
        ".animation-message",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1 },
        "-=0.3"
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="pista-animation" ref={sectionRef}>
      <div className="animation-heading">
        <span>THE GOODNESS OF PISTACHIOS</span>
        <h2>Nature Goes Into Every Scoop.</h2>
      </div>

      <div className="animation-stage">
        <div className="falling-pistas">
          {Array.from({ length: 8 }).map((_, index) => (
            <img
              key={index}
              src={pista}
              alt=""
              className="falling-pista"
              style={{
                left: `${15 + index * 9}%`,
              }}
            />
          ))}
        </div>

        <img
          src={bucket}
          alt="MASSUP ingredient bucket"
          className="pista-bucket"
        />
      </div>

      <div className="animation-message">
        <h3>Nature's Goodness. MASSUP Energy.</h3>
        <p>Every great day starts with better fuel.</p>
      </div>
    </section>
  );
};

export default PistachioAnimation;