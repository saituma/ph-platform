import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

type Pt = { latitude: number; longitude: number };

export function MiniRunPathPreview({
  points,
  height,
  colors,
}: {
  points: Pt[] | null | undefined;
  height: number;
  colors: Record<string, string>;
}) {
  const vbW = 100;
  const vbH = 60;

  const polylinePoints = useMemo(() => {
    if (!points || points.length < 2) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const p of points) {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
    }

    const pad = 6;
    const w = Math.max(1, vbW - pad * 2);
    const h = Math.max(1, vbH - pad * 2);
    const latSpan = Math.max(1e-9, maxLat - minLat);
    const lngSpan = Math.max(1e-9, maxLng - minLng);

    // Fit using the larger normalized span.
    const scaleX = w / lngSpan;
    const scaleY = h / latSpan;
    const scale = Math.min(scaleX, scaleY);

    const contentW = lngSpan * scale;
    const contentH = latSpan * scale;
    const offsetX = pad + (w - contentW) / 2;
    const offsetY = pad + (h - contentH) / 2;

    const toXY = (p: Pt) => {
      const x = offsetX + (p.longitude - minLng) * scale;
      // Y is inverted (north is up).
      const y = offsetY + (maxLat - p.latitude) * scale;
      return { x, y };
    };

    const pts = points.map((p) => toXY(p));
    const asStr = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

    return {
      polyline: asStr,
      start: pts[0]!,
      end: pts[pts.length - 1]!,
    };
  }, [points]);

  return (
    <View
      style={{
        width: "100%",
        height,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: `${colors.bg}aa`,
      }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${vbW} ${vbH}`}>
        {polylinePoints ? (
          <>
            <Polyline
              points={polylinePoints.polyline}
              fill="none"
              stroke={colors.mapRoute ?? colors.accent}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <Circle
              cx={polylinePoints.start.x}
              cy={polylinePoints.start.y}
              r={4}
              fill={colors.lime ?? colors.accent}
              stroke="#fff"
              strokeWidth={1}
            />
            <Circle
              cx={polylinePoints.end.x}
              cy={polylinePoints.end.y}
              r={4}
              fill={colors.coral ?? colors.accent}
              stroke="#fff"
              strokeWidth={1}
            />
          </>
        ) : (
          <Circle cx={vbW / 2} cy={vbH / 2} r={2} fill={colors.border} />
        )}
      </Svg>
    </View>
  );
}
