/*
 * Project component derived from @starwind-pro/shader-topographic-flow.
 * Reference: src/components/starwind-pro/shader-topographic-flow/shaders.ts
 * ADR: docs/DECISIONS.md#adr-023
 * Last upstream sync: 2026-09-21
 *
 * Differences from upstream: a `baseColor` input, and lines are laid down as
 * ink (mix) on light bases instead of added as glow, which washes out to
 * white on a light page. Dark bases keep the original additive maths.
 */
import {
  createRawShaderBackground,
  initRawShaderBackgrounds,
  type ShaderHandle,
  type ShaderInputDefinitions,
} from "@/lib/utils/starwind/shader-runtime";

const fragmentShaderSource = /* glsl */ `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uContourSpacing;
  uniform float uContourWidth;
  uniform float uContourDrift;
  uniform float uContourScale;
  uniform float uLineStrength;
  uniform vec3 uMapWashColor;
  uniform vec3 uContourLineColor;
  uniform vec3 uMajorLineColor;
  uniform vec3 uBaseColor;

  float hash(vec2 p) {
    p = fract(p * vec2(443.9, 127.1));
    p += dot(p, p + 31.41);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = mat2(0.86, 0.51, -0.51, 0.86) * p * 2.02 + 5.11;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec2 p = (2.0 * gl_FragCoord.xy - uResolution.xy) / max(uResolution.y, 1.0);
    float t = uTime * uContourDrift * 0.14;
    vec2 q = p * uContourScale + vec2(t, -t * 0.7);
    float terrain = fbm(q);
    terrain += fbm(q * 0.62 + vec2(7.0, -3.0)) * 0.36;

    float bands = terrain * 14.0 / uContourSpacing;
    float contourDistance = abs(fract(bands) - 0.5);
    float aa = max(fwidth(bands) * 1.5, 0.002);
    // Shift the stroke core while keeping its antialiasing transition fixed.
    float core = aa * (uContourWidth - 1.0) * 0.5;
    float contour = 1.0 - smoothstep(core, core + aa, contourDistance);
    float major = 1.0 - smoothstep(core * 2.2, (core + aa) * 2.2, abs(fract(bands * 0.25) - 0.5));
    float wash = smoothstep(0.2, 1.0, terrain);

    vec3 base = uBaseColor;
    vec3 mapWash = uMapWashColor;
    vec3 contourLine = uContourLineColor;
    vec3 majorLine = uMajorLineColor;
    vec3 washed = mix(base, mapWash, wash * 0.28);

    // Dark base: original additive glow.
    vec3 glow = washed;
    glow += contourLine * contour * 0.38 * uLineStrength;
    glow += majorLine * major * 0.18 * uLineStrength;

    // Light base: adding light to paper washes out to white, so lay the
    // lines down as ink instead. Major gets a bit more than the glow path
    // (0.3 vs 0.18) since gold barely shows on paper; it draws ~4x wider
    // than contours, so much more than that turns into paint.
    vec3 ink = washed;
    ink = mix(ink, contourLine, clamp(contour * 0.6 * uLineStrength, 0.0, 1.0));
    ink = mix(ink, majorLine, clamp(major * 0.3 * uLineStrength, 0.0, 1.0));

    float baseLuma = dot(base, vec3(0.2126, 0.7152, 0.0722));
    vec3 color = mix(glow, ink, step(0.5, baseLuma));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const shaderInputs = {
  contourSpacing: {
    attribute: "data-shader-contour-spacing",
    default: 1,
    min: 0.5,
    max: 2,
    type: "number",
    uniform: "uContourSpacing",
  },
  contourWidth: {
    attribute: "data-shader-contour-width",
    default: 1,
    min: 0.5,
    max: 3,
    type: "number",
    uniform: "uContourWidth",
  },

  contourDrift: {
    attribute: "data-shader-contour-drift",
    default: 0.28,
    max: 3,
    min: 0,
    type: "number",
    uniform: "uContourDrift",
  },
  contourLineColor: {
    attribute: "data-shader-contour-line-color",
    default: [0.18, 0.56, 0.98],
    type: "color",
    uniform: "uContourLineColor",
  },
  contourScale: {
    attribute: "data-shader-contour-scale",
    default: 3.4,
    max: 7,
    min: 0.5,
    type: "number",
    uniform: "uContourScale",
  },
  lineStrength: {
    attribute: "data-shader-line-strength",
    default: 0.75,
    max: 2,
    min: 0,
    type: "number",
    uniform: "uLineStrength",
  },
  majorLineColor: {
    attribute: "data-shader-major-line-color",
    default: [0.86, 0.72, 0.44],
    type: "color",
    uniform: "uMajorLineColor",
  },
  baseColor: {
    attribute: "data-shader-base-color",
    default: [0.018, 0.028, 0.032],
    type: "color",
    uniform: "uBaseColor",
  },
  mapWashColor: {
    attribute: "data-shader-map-wash-color",
    default: [0.1, 0.52, 0.48],
    type: "color",
    uniform: "uMapWashColor",
  },
} satisfies ShaderInputDefinitions;

export function initTopographicFlow(canvas: HTMLCanvasElement): ShaderHandle | null {
  return createRawShaderBackground(canvas, {
    fragmentShaderSource,
    rootSelector: "[data-shader-topographic-flow]",
    defaults: {
      maxDpr: 1.5,
      maxFps: 60,
    },
    inputs: shaderInputs,
    requiredExtensions: ["OES_standard_derivatives"],
  });
}

export function initTopographicFlowBackgrounds(): void {
  initRawShaderBackgrounds("[data-gvns-topo-canvas]", initTopographicFlow);
}
