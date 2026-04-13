// Copyright (c) 2021-2026 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

import h337 from "heatmap.js";
import { Translation2d } from "../geometry";
import { scaleValue } from "../util";

export const HEATMAP_GRADIENTS: Record<string, Record<number, string>> = {
  default: { 0.0: "blue", 0.5: "lime", 1.0: "red" },
  green: {
    0.0: "#003300",
    0.5: "#00ff00",
    1.0: "#ccffcc"
  },

  red: {
    0.0: "#330000",
    0.5: "#ff0000",
    1.0: "#ffcccc"
  },

  blue: {
    0.0: "#000033",
    0.5: "#0000ff",
    1.0: "#ccccff"
  },

  orange: {
    0.0: "#331a00",
    0.5: "#ff8800",
    1.0: "#ffe0b3"
  },

  cyan: {
    0.0: "#003333",
    0.5: "#00ffff",
    1.0: "#ccffff"
  },

  yellow: {
    0.0: "#333300",
    0.5: "#ffff00",
    1.0: "#ffffcc"
  },

  magenta: {
    0.0: "#330033",
    0.5: "#ff00ff",
    1.0: "#ffccff"
  },

  blueRed: {
    0.0: "blue",
    1.0: "red"
  },

  turbo: {
    0.0: "#30123b",
    0.25: "#4145ab",
    0.5: "#2ab0ff",
    0.75: "#7fff7f",
    1.0: "#ff0000"
  },

  inferno: {
    0.0: "#000004",
    0.25: "#420a68",
    0.5: "#932667",
    0.75: "#dd513a",
    1.0: "#fdea45"
  },

  laminar: {
    0.0: "#001f3f",
    0.5: "#ffffff",
    1.0: "#001a33"
  }
};

export default class Heatmap {
  private static HEATMAP_GRID_SIZE = 0.01;
  private static HEATMAP_RADIUS = 0.1;

  private container: HTMLElement;
  private heatmap: h337.Heatmap<"value", "x", "y"> | null = null;

  private lastPixelDimensions: [number, number] = [0, 0];
  private lastFieldDimensions: [number, number] = [0, 0];
  private lastTranslationsStr = "";

  private currentGradientName: string = "default";
  private currentGradient = HEATMAP_GRADIENTS["default"];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setGradient(name: string) {
    if (!(name in HEATMAP_GRADIENTS)) return;

    this.currentGradientName = name;
    this.currentGradient = HEATMAP_GRADIENTS[name];

    if (this.heatmap) {
      this.heatmap.configure({
        gradient: this.currentGradient
      } as any);
    }
  }

  getGradient(): string {
    return this.currentGradientName;
  }

  getCanvas(): HTMLCanvasElement | null {
    let canvas = this.container.getElementsByTagName("canvas");
    return canvas.length === 0 ? null : canvas[0];
  }

  update(translations: Translation2d[], pixelDimensions: [number, number], fieldDimensions: [number, number]) {
    let newHeatmapInstance = false;
    if (
      pixelDimensions[0] !== this.lastPixelDimensions[0] ||
      pixelDimensions[1] !== this.lastPixelDimensions[1] ||
      fieldDimensions[0] !== this.lastFieldDimensions[0] ||
      fieldDimensions[1] !== this.lastFieldDimensions[1]
    ) {
      newHeatmapInstance = true;
      this.lastPixelDimensions = pixelDimensions;
      this.lastFieldDimensions = fieldDimensions;

      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      this.container.style.width = pixelDimensions[0] + "px";
      this.container.style.height = pixelDimensions[1] + "px";

      this.heatmap = h337.create({
        container: this.container,
        radius: pixelDimensions[1] * Heatmap.HEATMAP_RADIUS,
        maxOpacity: 0.75,
        gradient: this.currentGradient
      });
    }

    const gridSizeMeters = fieldDimensions[1] * Heatmap.HEATMAP_GRID_SIZE;
    let translationsStr = JSON.stringify(translations);

    if (translationsStr !== this.lastTranslationsStr || newHeatmapInstance) {
      this.lastTranslationsStr = translationsStr;

      let grid: number[][] = [];

      for (let x = 0; x < fieldDimensions[0] + gridSizeMeters; x += gridSizeMeters) {
        let column: number[] = [];
        grid.push(column);
        for (let y = 0; y < fieldDimensions[1] + gridSizeMeters; y += gridSizeMeters) {
          column.push(0);
        }
      }

      translations.forEach((translation) => {
        let gridX = Math.floor((translation[0] + fieldDimensions[0] / 2) / gridSizeMeters);
        let gridY = Math.floor((translation[1] + fieldDimensions[1] / 2) / gridSizeMeters);

        if (gridX >= 0 && gridY >= 0 && gridX < grid.length && gridY < grid[0].length) {
          grid[gridX][gridY] += 1;
        }
      });

      let heatmapData: { x: number; y: number; value: number }[] = [];
      let x = gridSizeMeters / 2;
      let maxValue = 0;

      grid.forEach((column) => {
        x += gridSizeMeters;
        let y = gridSizeMeters / 2;

        column.forEach((gridValue) => {
          y += gridSizeMeters;

          let coordinates = [
            scaleValue(x, [0, fieldDimensions[0]], [0, pixelDimensions[0]]),
            scaleValue(y, [0, fieldDimensions[1]], [pixelDimensions[1], 0])
          ];

          coordinates[0] = Math.round(coordinates[0]);
          coordinates[1] = Math.round(coordinates[1]);

          maxValue = Math.max(maxValue, gridValue);

          if (gridValue > 0) {
            heatmapData.push({
              x: coordinates[0],
              y: coordinates[1],
              value: Math.log1p(gridValue)
            });
          }
        });
      });

      this.heatmap?.setData({
        min: 0,
        max: Math.log1p(maxValue),
        data: heatmapData
      });
    }
  }
}
