
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <style>{`
        .massup-nav-wrap {
          background: #A9C18F;
          padding: 14px 5%;
          font-family: Arial, sans-serif;
        }

        .massup-navbar {
          max-width: 1400px;
          margin: 0 auto;
          padding: 17px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: #FFF9EB;
          border: 1px solid rgba(67, 82, 56, 0.09);
          border-radius: 18px;
          box-shadow: 0 5px 18px rgba(67, 82, 56, 0.05);
          position: relative;
          z-index: 100;
        }

        .massup-brand {
          color: #435238;
          text-decoration: none;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: 3px;
          line-height: 1;
          white-space: nowrap;
        }

        .massup-brand span {
          color: #8DA675;
        }

        .massup-tagline {
          display: block;
          margin-top: 5px;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 2px;
          color: #75624D;
        }

        .massup-nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
        }

        .massup-nav-links a {
          color: #435238;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .massup-nav-links a:hover,
        .massup-nav-links a.active {
          color: #8DA675;
        }

        .massup-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .massup-shop-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px 20px;
          background: #687B4E;
          color: #FFF9EB;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s ease;
        }

        .massup-shop-btn:hover {
          background: #435238;
        }

        .massup-menu-btn {
          display: none;
          width: 42px;
          height: 42px;
          border: 1px solid #D9DFC9;
          border-radius: 50%;
          background: #F0F7E8;
          color: #435238;
          font-size: 22px;
          cursor: pointer;
        }

        @media (max-width: 760px) {
          .massup-nav-wrap {
            padding: 10px 12px;
          }

          .massup-navbar {
            padding: 13px 15px;
            border-radius: 16px;
            gap: 10px;
          }

          .massup-brand {
            font-size: 23px;
            letter-spacing: 2px;
          }

          .massup-tagline {
            font-size: 7px;
            letter-spacing: 1.5px;
          }

          .massup-menu-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .massup-nav-actions {
            margin-left: auto;
            gap: 8px;
          }

          .massup-shop-btn {
            padding: 12px 14px;
            font-size: 11px;
          }

          .massup-nav-links {
            display: none;
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            padding: 18px;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            background: #FFF9EB;
            border: 1px solid #D9DFC9;
            border-radius: 16px;
            box-shadow: 0 12px 25px rgba(67, 82, 56, 0.12);
          }

          .massup-nav-links.menu-open {
            display: flex;
          }

          .massup-nav-links a {
            padding: 15px 8px;
            border-bottom: 1px solid #E8E8D9;
            font-size: 14px;
          }

          .massup-nav-links a:last-child {
            border-bottom: none;
          }
        }

        @media (max-width: 380px) {
          .massup-brand {
            font-size: 20px;
          }

          .massup-shop-btn {
            padding: 11px;
            font-size: 10px;
          }

          .massup-navbar {
            padding: 12px 10px;
          }
        }
      `}</style>

      <header className="massup-nav-wrap">
        <nav className="massup-navbar" aria-label="Main navigation">
          <Link to="/" className="massup-brand" onClick={closeMenu}>
            MASSUP<span>.</span>
            <span className="massup-tagline">FUEL YOUR BETTER</span>
          </Link>

          <div className={`massup-nav-links ${menuOpen ? "menu-open" : ""}`}>
            <Link
              to="/"
              className={location.pathname === "/" ? "active" : ""}
              onClick={closeMenu}
            >
              Home
            </Link>

            <Link
              to="/products"
              className={location.pathname === "/products" ? "active" : ""}
              onClick={closeMenu}
            >
              Products
            </Link>

            <a href="/#about" onClick={closeMenu}>
              Our Story
            </a>
          </div>

          <div className="massup-nav-actions">
            <Link to="/products" className="massup-shop-btn" onClick={closeMenu}>
              SHOP NOW <span aria-hidden="true">↗</span>
            </Link>

            <button
              type="button"
              className="massup-menu-btn"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? "×" : "☰"}
            </button>
          </div>
        </nav>
      </header>
    </>
  );
}

export default Navbar;
