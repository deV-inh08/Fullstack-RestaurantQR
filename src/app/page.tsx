'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useGetDishes } from "../queries/useDish"
import { handleImageURL } from "@/src/lib/utils"
import QRScannerModal from "@/src/components/admin/QRscanner"

// ─── Hook detect mobile ───────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [breakpoint])
  return isMobile
}

export default function HomePage() {
  const router = useRouter()
  const { data } = useGetDishes()
  const [showScanner, setShowScanner] = useState(false)
  const isMobile = useIsMobile()

  const featuredDishes = (data?.payload.data.data ?? [])
    .filter((d) => d.status === "Available")
    .slice(0, 3)

  return (
    <div style={{ backgroundColor: "#0D0B08", color: "#F5F0E8" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "#0D0B08",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: isMobile ? "12px 16px" : "14px 40px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              backgroundColor: "#FFC000", color: "#000",
              width: "32px", height: "32px", borderRadius: "6px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "800", fontSize: "13px",
            }}>VG</div>
            <span style={{
              fontSize: isMobile ? "13px" : "15px",
              fontWeight: "700", letterSpacing: "0.1em", color: "#F5F0E8",
            }}>VIET GOLD</span>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "16px" }}>
            <Link href="/login" style={{
              fontSize: isMobile ? "11px" : "13px",
              color: "#8A7F72", letterSpacing: "0.06em", textDecoration: "none",
            }}>
              {isMobile ? "LOGIN" : "ADMIN LOGIN"}
            </Link>
            <button
              onClick={() => setShowScanner(true)}
              style={{
                backgroundColor: "#FFC000", color: "#000",
                fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em",
                padding: isMobile ? "8px 12px" : "9px 18px",
                borderRadius: "6px", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              SCAN QR
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <QRScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{
        height: "100vh",
        minHeight: isMobile ? "600px" : undefined,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0D0B08",
      }}>
        {/* Background image */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: isMobile ? "100%" : "55%",
          backgroundImage: `url(https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=1200&q=80)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: isMobile
            ? "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, black 80%)"
            : "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 25%, black 65%)",
          WebkitMaskImage: isMobile
            ? "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, black 80%)"
            : "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 25%, black 65%)",
        }} />

        {/* Extra gradient for mobile text legibility */}
        {isMobile && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            background: "linear-gradient(to top, rgba(13,11,8,1) 35%, rgba(13,11,8,0.6) 65%, rgba(13,11,8,0.15) 100%)",
          }} />
        )}

        {/* Content */}
        <div style={{
          position: "absolute", zIndex: 10,
          ...(isMobile
            ? { left: 0, right: 0, bottom: "48px", padding: "0 24px" }
            : { left: 0, top: 0, bottom: 0, paddingLeft: "56px", maxWidth: "500px", display: "flex", alignItems: "center" }
          ),
        }}>
          <div style={{ width: "100%" }}>
            <div style={{
              color: "#FFC000", fontSize: "10px", fontWeight: "600",
              letterSpacing: "0.2em", marginBottom: "12px",
            }}>
              AUTHENTIC VIETNAMESE CUISINE
            </div>

            <h1 style={{
              fontSize: isMobile ? "52px" : "68px",
              fontWeight: "800", lineHeight: "0.92",
              letterSpacing: "-0.02em", color: "#F5F0E8",
              margin: "0 0 16px 0",
            }}>
              VIET GOLD
            </h1>

            <p style={{
              fontSize: isMobile ? "13px" : "15px",
              color: "#8A7F72", lineHeight: "1.6",
              maxWidth: "340px", margin: "0 0 28px 0",
            }}>
              Experience the finest Vietnamese flavors, crafted with tradition and passion.
            </p>

            {/* CTA buttons — stacked on mobile */}
            <div style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: "10px",
            }}>
              <button
                onClick={() => router.push("/login")}
                style={{
                  backgroundColor: "#FFC000", color: "#000",
                  fontSize: "13px", fontWeight: "700", letterSpacing: "0.06em",
                  padding: "13px 22px", borderRadius: "6px",
                  border: "none", cursor: "pointer", textAlign: "center",
                }}
              >
                EXPLORE MENU →
              </button>
              <button
                onClick={() => router.push("/reservation_public")}
                style={{
                  backgroundColor: "transparent", color: "#F5F0E8",
                  fontSize: "13px", fontWeight: "600", letterSpacing: "0.06em",
                  padding: "13px 22px", borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.22)",
                  cursor: "pointer", textAlign: "center",
                }}
              >
                BOOK A TABLE
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: "#110F0C",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: isMobile ? "16px" : "20px 40px",
      }}>
        {isMobile ? (
          // Mobile: 2×2 card grid
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { value: "50+", label: "DISHES" },
              { value: "15", label: "TABLES" },
              { value: "4.9★", label: "RATING" },
              { value: "8yr", label: "SERVING" },
            ].map((stat, idx) => (
              <div key={idx} style={{
                backgroundColor: "#1A1714", borderRadius: "8px",
                padding: "14px", textAlign: "center",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#FFC000" }}>{stat.value}</div>
                <div style={{ fontSize: "10px", color: "#8A7F72", letterSpacing: "0.12em", marginTop: "3px" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop: horizontal row with dividers (original layout)
          <div style={{ display: "flex", justifyContent: "center", gap: "48px" }}>
            {[
              { value: "50+", label: "DISHES" },
              { value: "15", label: "TABLES" },
              { value: "4.9★", label: "RATING" },
              { value: "8yr", label: "SERVING" },
            ].map((stat, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: idx < 3 ? "48px" : "0" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: "#FFC000" }}>{stat.value}</div>
                  <div style={{ fontSize: "10px", color: "#8A7F72", letterSpacing: "0.12em", marginTop: "2px" }}>{stat.label}</div>
                </div>
                {idx < 3 && <div style={{ width: "1px", height: "30px", backgroundColor: "rgba(255,255,255,0.08)" }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FEATURED DISHES ────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? "24px 16px" : "36px 40px" }}>
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{
            fontSize: isMobile ? "14px" : "18px",
            fontWeight: "700", letterSpacing: "0.08em", color: "#F5F0E8", margin: 0,
          }}>
            FEATURED DISHES
          </h2>
          <Link href="/login" style={{ fontSize: "11px", color: "#FFC000", letterSpacing: "0.08em", textDecoration: "none" }}>
            {isMobile ? "ALL →" : "VIEW ALL MENU →"}
          </Link>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "10px" : "14px",
        }}>
          {featuredDishes.map((dish, idx) => (
            <div
              key={dish.id}
              style={{
                backgroundColor: "#1A1714",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.06)",
                transition: "border-color 0.2s",
                // Mobile: horizontal row; Desktop: vertical card
                display: "flex",
                flexDirection: isMobile ? "row" : "column",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,192,0,0.3)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)" }}
            >
              {/* Image */}
              <div style={{
                backgroundImage: `url(${handleImageURL(dish.imagePath ?? "")})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                flexShrink: 0,
                width: isMobile ? "100px" : "auto",
                height: isMobile ? "auto" : "150px",
                minHeight: isMobile ? "90px" : undefined,
              }} />

              {/* Body */}
              <div style={{
                padding: isMobile ? "12px" : "14px 16px",
                flex: 1,
                display: "flex", flexDirection: "column", justifyContent: "center",
              }}>
                <h3 style={{
                  fontSize: "13px", fontWeight: "700",
                  letterSpacing: "0.05em", color: "#F5F0E8",
                  margin: "0 0 4px 0",
                }}>
                  {dish.name}
                </h3>
                {!isMobile && (
                  <p style={{ fontSize: "11px", color: "#8A7F72", lineHeight: "1.4", margin: "0 0 10px 0" }}>
                    Vietnamese specialty with authentic flavors
                  </p>
                )}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: isMobile ? "6px" : "0",
                }}>
                  <span style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: "700", color: "#FFC000" }}>
                    ₫{dish.price.toLocaleString()}
                  </span>
                  {idx === 0 && (
                    <span style={{
                      backgroundColor: "rgba(34,197,94,0.12)", color: "#22c55e",
                      borderRadius: "999px", fontSize: "10px", padding: "3px 9px",
                    }}>POPULAR</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY VIET GOLD ──────────────────────────────────────────────────── */}
      <section style={{
        backgroundColor: "#110F0C",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: isMobile ? "24px 16px" : "32px 40px",
      }}>
        <h2 style={{
          fontSize: isMobile ? "14px" : "16px",
          fontWeight: "700", letterSpacing: "0.08em", color: "#F5F0E8",
          margin: "0 0 14px 0",
        }}>
          WHY VIET GOLD
        </h2>

        {/* Mobile: 2×2; Desktop: 4 columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: "10px",
        }}>
          {[
            { label: "Fresh Daily", text: "Ingredients sourced fresh every morning" },
            { label: "QR Ordering", text: "Scan, order and pay from your table" },
            { label: "Family Recipes", text: "Authentic recipes passed down through generations" },
            { label: "Fast Service", text: "Real-time kitchen updates, minimal wait times" },
          ].map((feature, idx) => (
            <div key={idx} style={{
              backgroundColor: "#1A1714", borderRadius: "10px",
              padding: isMobile ? "14px" : "16px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: "14px", color: "#FFC000", marginBottom: "6px" }}>★</div>
              <h3 style={{
                fontSize: "12px", fontWeight: "700",
                letterSpacing: "0.04em", color: "#F5F0E8", margin: "0 0 4px 0",
              }}>{feature.label}</h3>
              <p style={{ fontSize: "11px", color: "#8A7F72", lineHeight: "1.5", margin: 0 }}>
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: isMobile ? "20px 16px" : "16px 40px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: isMobile ? "center" : "space-between",
        alignItems: "center",
        gap: isMobile ? "12px" : undefined,
        textAlign: isMobile ? "center" : undefined,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            backgroundColor: "#FFC000", color: "#000",
            width: "28px", height: "28px", borderRadius: "4px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "10px", fontWeight: "700",
          }}>VG</div>
          <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", color: "#F5F0E8" }}>
            VIET GOLD
          </span>
        </div>
        <p style={{ fontSize: "11px", color: "#8A7F72", margin: 0 }}>© 2024 Viet Gold Restaurant</p>
        <div style={{ display: "flex", gap: "20px" }}>
          {["MENU", "PRIVACY", "CONTACT"].map((link) => (
            <a key={link} href="#" style={{ fontSize: "11px", color: "#8A7F72", textDecoration: "none" }}>
              {link}
            </a>
          ))}
        </div>
      </footer>

    </div>
  )
}