import { motion } from "framer-motion";
import theme from "../constants/theme";

/**
 * Wraps any element with a traveling border-glow animation effect.
 * Inspired by the animated border button pattern using CSS offset-path masking.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.radius=6] - Border radius in px (for rectangular shapes)
 * @param {boolean} [props.isCircle=false] - Use circular path instead of rect
 * @param {string} [props.color] - Glow color (defaults to theme.accent)
 * @param {number} [props.duration=4] - Animation duration in seconds
 * @param {object} [props.style] - Extra styles applied to the wrapper div
 */
export function AnimatedBorderButton({
  children,
  radius = 6,
  isCircle = false,
  color,
  duration = 4,
  style,
}) {
  const glowColor = color || theme.accent;
  const borderRadius = isCircle ? "50%" : radius;
  const offsetPath = isCircle
    ? "circle(50% at 50% 50%)"
    : `rect(0 auto auto 0 round ${radius}px)`;

  return (
    <div style={{ position: "relative", display: "inline-flex", borderRadius, ...style }}>
      {/* Animated border overlay */}
      <div
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: "inherit",
          border: "2px solid transparent",
          pointerEvents: "none",
          // CSS masking: show only the border ring (2px annulus)
          WebkitMaskClip: "padding-box, border-box",
          maskClip: "padding-box, border-box",
          WebkitMaskComposite: "intersect",
          maskComposite: "intersect",
          WebkitMaskImage:
            "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
          maskImage:
            "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            width: 20,
            height: 20,
            background: `linear-gradient(90deg, transparent, ${glowColor}, ${glowColor})`,
            offsetPath,
          }}
          animate={{ offsetDistance: ["0%", "100%"] }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration,
            ease: "linear",
          }}
        />
      </div>
      {children}
    </div>
  );
}

export default AnimatedBorderButton;
