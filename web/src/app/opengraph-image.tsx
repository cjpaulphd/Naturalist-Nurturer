import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Naturalist Nurturer - Know Your Neighbors. Learn the Species Where You Are.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(150deg, #072b1e 0%, #0f4a2e 25%, #14532d 50%, #166534 75%, #1a7a3e 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background:
              "linear-gradient(90deg, #22c55e 0%, #86efac 30%, #4ade80 60%, #22c55e 100%)",
            display: "flex",
          }}
        />

        {/* Background decorative circles for depth */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.035)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 80,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.025)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.035)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 140,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.025)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 50,
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.03)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 260,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.02)",
            display: "flex",
          }}
        />

        {/* Leaf icon */}
        <div style={{ fontSize: 76, marginBottom: 6, display: "flex" }}>
          🌿
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          Naturalist Nurturer
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 27,
            color: "rgba(255, 255, 255, 0.82)",
            marginTop: 18,
            fontWeight: 500,
            display: "flex",
          }}
        >
          Know Your Neighbors. Learn the Species Where You Are.
        </div>

        {/* Decorative divider */}
        <div
          style={{
            width: 80,
            height: 3,
            background:
              "linear-gradient(90deg, rgba(134,239,172,0), rgba(134,239,172,0.6), rgba(134,239,172,0))",
            borderRadius: 2,
            marginTop: 30,
            marginBottom: 30,
            display: "flex",
          }}
        />

        {/* Feature category pills - all 8 taxa */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 820,
          }}
        >
          {[
            "🌳 Trees",
            "🌸 Plants",
            "🐦 Birds",
            "🍄 Fungi",
            "🦋 Insects",
            "🦌 Mammals",
            "🦎 Reptiles",
            "🐸 Amphibians",
          ].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255, 255, 255, 0.11)",
                color: "rgba(255, 255, 255, 0.92)",
                padding: "8px 22px",
                borderRadius: 50,
                fontSize: 19,
                fontWeight: 600,
                display: "flex",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 22,
            fontSize: 17,
            color: "rgba(255, 255, 255, 0.4)",
            display: "flex",
            letterSpacing: 2,
          }}
        >
          natnurturer.org
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 5,
            background:
              "linear-gradient(90deg, #22c55e 0%, #86efac 30%, #4ade80 60%, #22c55e 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
