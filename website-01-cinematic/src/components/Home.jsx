
import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";
import PistachioAnimation from "./PistachioAnimation";

import heroVideo from "../assets/images/vid1.mp4";

import prod1 from "../assets/images/prod1.jpeg";
import prod2 from "../assets/images/prod2.jpeg";
import prod3 from "../assets/images/prod3.jpeg";
import prod4 from "../assets/images/prod4.jpeg";
import prod5 from "../assets/images/prod5.jpeg";
import prod6 from "../assets/images/prod6.jpeg";

const Home = () => {
  const products = [
    prod1,
    prod2,
    prod3,
    prod4,
    prod5,
    prod6,
  ];

  return (
    <main className="home">
      <div className="page-container">
        {/* HERO */}
        <section className="hero">
          <div className="hero-content">
            <span className="hero-label">
              PISTACHIO PROTEIN POWDER
            </span>

            <h1>
              GOOD FUEL.
              <br />
              GREAT FEELING.
            </h1>

            <p>
              Premium pistachio protein powder crafted for everyday
              performance, delicious flavour, and a cleaner way
              to fuel your day.
            </p>

            <Link
              to="/shop"
              className="btn-primary"
            >
              Shop Now
            </Link>
          </div>

          <div className="hero-image">
            <video
              className="hero-video"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src={heroVideo} type="video/mp4" />
            </video>
          </div>
        </section>

        {/* PISTACHIO SCROLL ANIMATION */}
        <PistachioAnimation />

        {/* PRODUCT SHOWCASE */}
        <section className="products-showcase">
          <div className="section-header">
            <span className="section-tag">OUR COLLECTION</span>
            <h2>Fuel Every Goal</h2>
          </div>

          <div className="products-scroll">
            {products.map((product, index) => (
              <div className="product-item" key={index}>
                <img
                  src={product}
                  alt={`Product ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* BENEFITS */}
        <section className="benefits">
          <div className="benefit-card">
            <h3>Protein</h3>
            <p>
              High-quality protein to support recovery, strength and daily nutrition.
            </p>
          </div>

          <div className="benefit-card">
            <h3>Great Taste</h3>
            <p>
              Smooth pistachio flavour that feels indulgent without compromise.
            </p>
          </div>

          <div className="benefit-card">
            <h3>Everyday Fuel</h3>
            <p>
              Perfect for workouts, busy mornings and active lifestyles.
            </p>
          </div>
        </section>

        {/* FEATURED */}
        <section className="featured-product">
          <div className="featured-image">
            <img src={prod1} alt="MASSUP Protein" />
          </div>

          <div className="featured-content">
            <span className="section-tag">FEATURED PRODUCT</span>

            <h2>MASSUP Pistachio Protein Powder</h2>

            <p>
              The signature MASSUP blend delivers great taste, clean nutrition and premium pistachio flavour in every scoop.
            </p>

            <Link
              to="/product/massup-pistachio"
              className="btn-primary"
            >
              View Product
            </Link>
          </div>
        </section>

        {/* FLAVOURS */}
        <section className="flavours">
          <div className="section-header">
            <span className="section-tag">FLAVOURS</span>
            <h2>Pick Your Favourite</h2>
          </div>

          <div className="flavour-grid">
            <div className="flavour-card featured-flavour">
              <h3>Pistachio</h3>
              <p>Rich, creamy and naturally nutty.</p>
            </div>

            <div className="flavour-card">
              <h3>Vanilla</h3>
              <p>Smooth vanilla flavour with a clean finish.</p>
            </div>

            <div className="flavour-card">
              <h3>Chocolate</h3>
              <p>Deep cocoa flavour for satisfying shakes.</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div>
            <h3 className="footer-logo">MASSUP</h3>
            <p>Premium Pistachio Protein.</p>
          </div>

          <nav className="footer-nav">
            <Link to="/">Home</Link>
            <Link to="/shop">Shop</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
};

export default Home;
