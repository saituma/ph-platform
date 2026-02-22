"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const GREEN = "hsl(142 71% 45%)";
const GREEN_SOFT = "hsl(142 45% 45%)";
const GREEN_MUTED = "hsl(142 20% 40%)";

export function GreenLineChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            data: values,
            borderColor: GREEN,
            backgroundColor: "rgba(34,197,94,0.18)",
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 4,
            fill: true,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { intersect: false, mode: "index" },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "hsl(142 5% 45%)" } },
          y: { grid: { color: "hsl(142 10% 90%)" }, ticks: { color: "hsl(142 5% 45%)" } },
        },
      }}
      height={220}
    />
  );
}

export function GreenDoughnutChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  return (
    <Doughnut
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [GREEN_MUTED, GREEN_SOFT, GREEN],
            borderColor: "hsl(0 0% 100%)",
            borderWidth: 2,
          },
        ],
      }}
      options={{
        plugins: {
          legend: { display: false },
        },
        cutout: "68%",
      }}
    />
  );
}

export function GreenStackedBars({
  labels,
  datasets,
}: {
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: datasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.data,
          backgroundColor: dataset.color ?? [GREEN, GREEN_SOFT, GREEN_MUTED][index % 3],
          borderRadius: 8,
        })),
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { color: "hsl(142 10% 90%)" } },
        },
      }}
      height={220}
    />
  );
}
