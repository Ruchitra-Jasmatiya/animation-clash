import React from "react";
import { Link } from "react-router-dom";
import "./Product.css";

const Product = () => {
  return (
    <main className="product-page">
      <div className="product-container">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/products">Products</Link>
          <span>/</span>
          <span>Pistachio Protein Powder</span>
        </nav>

        {/* Product Hero */}
        <section className="product-hero">
          <div className="product-image">
            <img
              src="/images/massup-product.png"
              alt="MASSUP Pistachio Protein Powder"
            />
          </div>

          <div className="product-details">
            <span className="product-tag">SIGNATURE FLAVOUR</span>

            <h1>MASSUP Pistachio Protein Powder</h1>

            <p className="flavour">Flavour: Pistachio</p>

            <p className="description">
              A premium pistachio protein powder designed to fit effortlessly
              into your daily routine. Smooth texture, delicious flavour, and
              made for active lifestyles.
            </p>

            <div className="price">
              ₹XXX <span>(Price Placeholder)</span>
            </div>

            <button className="add-cart-btn">
              Add to Cart
            </button>
          </div>
        </section>

        {/* Benefits */}
        <section className="benefits-section">
          <div className="benefit-card">
            <h3>Protein</h3>
            <p>
              Supports your fitness and nutrition goals throughout the day.
            </p>
          </div>

          <div className="benefit-card">
            <h3>Great Taste</h3>
            <p>
              Rich pistachio flavour crafted to make every shake enjoyable.
            </p>
          </div>

          <div className="benefit-card">
            <h3>Everyday Fuel</h3>
            <p>
              Easy to enjoy before workouts, after training, or anytime.
            </p>
          </div>
        </section>

        {/* Product Info */}
        <section className="product-info">
          <h2>Product Information</h2>

          <div className="info-grid">
            <div className="info-card">
              <h3>Ingredients</h3>
              <p>
                Placeholder ingredients list. Add verified ingredients once
                product formulation is finalized.
              </p>
            </div>

            <div className="info-card">
              <h3>Nutritional Information</h3>
              <p>
                Placeholder nutrition panel. Add verified serving size,
                calories, protein content, and other nutritional values.
              </p>
            </div>

            <div className="info-card">
              <h3>Suggested Usage</h3>
              <p>
                Placeholder instructions. Add recommended serving quantity and
                preparation method.
              </p>
            </div>
          </div>
        </section>

        {/* Related Flavours */}
        <section className="related-products">
          <div className="section-header">
            <span className="section-tag">RELATED FLAVOURS</span>
            <h2>Explore More Flavours</h2>
          </div>

          <div className="flavour-grid">
            <div className="flavour-card featured-flavour">
              <h3>Pistachio</h3>
              <p>Our signature flavour and customer favourite.</p>
            </div>

            <div className="flavour-card">
              <h3>Vanilla</h3>
              <p>Clean, smooth vanilla taste for everyday shakes.</p>
            </div>

            <div className="flavour-card">
              <h3>Chocolate</h3>
              <p>Rich cocoa flavour for a more indulgent experience.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Product;