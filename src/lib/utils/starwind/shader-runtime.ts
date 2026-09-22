export type ShaderColor = [number, number, number];

export type ShaderInputValue = ShaderColor | number;
export type ShaderInputValues = Record<string, ShaderInputValue>;

export type ShaderInputDefinition =
  | {
      attribute: string;
      default: ShaderColor;
      type: "color";
      uniform: string;
    }
  | {
      attribute: string;
      default: number;
      max?: number;
      min?: number;
      type: "number";
      uniform: string;
    };

export type ShaderInputDefinitions = Record<string, ShaderInputDefinition>;

/**
 * Common, low-level controls shared by one-pass component-lab shader backgrounds.
 *
 * Keep this runtime focused on WebGL setup, lifecycle, resize, animation timing,
 * common uniforms, optional theme uniforms, and optional pointer coordinates.
 * Effect semantics such as click-ripple history, gesture trails, emitters, and
 * shader-specific interaction buffers belong in the owning shader module unless
 * they are intentionally promoted into a documented common primitive.
 */
export interface ShaderOptions {
  maxDpr: number;
  maxFps: number;
  pointerEnabled?: boolean;
}

export interface ShaderUpdate {
  inputs?: Partial<ShaderInputValues>;
  maxDpr?: number;
  maxFps?: number;
  pointerEnabled?: boolean;
}

export interface ShaderHandle {
  dispose: () => void;
  refreshFromDataset: () => void;
  update: (patch: ShaderUpdate) => void;
}

export interface ShaderProgramContext {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  root: HTMLElement;
}

export interface ShaderDrawContext extends ShaderProgramContext {
  elapsedTime: number;
  now: number;
}

export interface ShaderRuntimeConfig {
  fragmentShaderSource: string;
  rootSelector: string;
  defaults: Partial<ShaderOptions>;
  enableThemeColors?: boolean;
  enablePointer?: boolean;
  fallbackTimeoutMs?: number;
  inputs?: ShaderInputDefinitions;
  // Common pointer activation semantics only. Effect-specific click histories
  // and ripple buffers belong in the shader module.
  pointerMode?: "hover" | "click";
  requiredExtensions?: string[];
  onBeforeDraw?: (context: ShaderDrawContext) => void;
  onDispose?: () => void;
  onProgramReady?: (context: ShaderProgramContext) => void;
}

type ShaderCanvas = HTMLCanvasElement & {
  __starwindShaderHandle?: ShaderHandle;
};

const vertexShaderSource = /* glsl */ `
  attribute vec2 aPosition;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const instances = new WeakMap<HTMLCanvasElement, ShaderBackground>();
const baseObservedAttributes = [
  "data-shader-max-dpr",
  "data-shader-max-fps",
  "data-shader-pointer-enabled",
];

const defaultShaderOptions: ShaderOptions = {
  maxDpr: 1.5,
  maxFps: 60,
  pointerEnabled: true,
};
const defaultFallbackTimeoutMs = 2000;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readNumber(value: string | undefined, fallback: number, min: number, max: number) {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  return clampNumber(parsed, min, max);
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function normalizeByteChannel(value: number) {
  return Number((clampNumber(value, 0, 255) / 255).toFixed(4));
}

function parseCssByteChannel(value: string) {
  const trimmed = value.trim();

  if (trimmed.endsWith("%")) {
    const percentage = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(percentage)) return null;
    return clampNumber(percentage, 0, 100) * 2.55;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

function parseColorAlpha(value: string | undefined) {
  if (!value) return null;

  const trimmed = value.trim();

  if (trimmed.endsWith("%")) {
    const percentage = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(percentage)) return null;
    return clampNumber(percentage / 100, 0, 1);
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;

  return clampNumber(parsed, 0, 1);
}

function parseHexColor(value: string): ShaderColor | null {
  let normalized = value.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3,4}$/.test(normalized)) {
    normalized = normalized
      .split("")
      .map((channel) => channel + channel)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(normalized)) return null;

  if (normalized.length === 8) {
    const alpha = parseInt(normalized.slice(6, 8), 16) / 255;
    if (alpha <= 0.01) return null;
  }

  return [
    normalizeByteChannel(parseInt(normalized.slice(0, 2), 16)),
    normalizeByteChannel(parseInt(normalized.slice(2, 4), 16)),
    normalizeByteChannel(parseInt(normalized.slice(4, 6), 16)),
  ];
}

function parseCommaSeparatedColor(value: string): ShaderColor | null {
  const channels = value.split(",").map((channel) => Number(channel.trim()));
  if (channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) {
    return null;
  }

  if (channels.every((channel) => channel >= 0 && channel <= 1)) {
    return [
      clampNumber(channels[0], 0, 1),
      clampNumber(channels[1], 0, 1),
      clampNumber(channels[2], 0, 1),
    ];
  }

  return [
    normalizeByteChannel(channels[0]),
    normalizeByteChannel(channels[1]),
    normalizeByteChannel(channels[2]),
  ];
}

function parseCssRgb(value: string | undefined): ShaderColor | null {
  if (!value) return null;
  if (value.trim().toLowerCase() === "transparent") return null;

  const match = value
    .trim()
    .match(
      /^rgba?\(\s*([+-]?[\d.]+%?)(?:\s*,\s*|\s+)([+-]?[\d.]+%?)(?:\s*,\s*|\s+)([+-]?[\d.]+%?)(?:\s*(?:,|\/)\s*([+-]?[\d.]+%?))?\s*\)$/i,
    );

  if (!match) return null;

  const alpha = parseColorAlpha(match[4]);
  if (alpha !== null && alpha <= 0.01) return null;

  const red = parseCssByteChannel(match[1]);
  const green = parseCssByteChannel(match[2]);
  const blue = parseCssByteChannel(match[3]);

  if (red === null || green === null || blue === null) return null;

  return [normalizeByteChannel(red), normalizeByteChannel(green), normalizeByteChannel(blue)];
}

function readCanvasColor(value: string): ShaderColor | null {
  if (typeof document === "undefined") return null;
  if (typeof CSS !== "undefined" && CSS.supports && !CSS.supports("color", value)) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);

  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return [normalizeByteChannel(red), normalizeByteChannel(green), normalizeByteChannel(blue)];
}

function resolveCssColor(value: string, root: HTMLElement): ShaderColor | null {
  if (typeof document === "undefined" || typeof window === "undefined") return null;
  if (typeof CSS !== "undefined" && CSS.supports && !CSS.supports("color", value)) return null;

  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.pointerEvents = "none";
  probe.style.visibility = "hidden";
  probe.style.color = value;

  const parent = root.isConnected ? root : document.body;
  parent.appendChild(probe);
  const resolved = window.getComputedStyle(probe).color;
  probe.remove();

  return parseCssRgb(resolved) ?? readCanvasColor(resolved);
}

function readColor(
  value: string | undefined,
  fallback: ShaderColor,
  root: HTMLElement,
): ShaderColor {
  if (!value) return fallback;

  const parsedColor =
    parseHexColor(value) ??
    parseCssRgb(value) ??
    parseCommaSeparatedColor(value) ??
    resolveCssColor(value, root);

  return parsedColor ?? fallback;
}

function readInputValue(
  canvas: HTMLCanvasElement,
  input: ShaderInputDefinition,
  root: HTMLElement,
): ShaderInputValue {
  const value = canvas.getAttribute(input.attribute) ?? undefined;

  if (input.type === "color") return readColor(value, input.default, root);

  return readNumber(
    value,
    input.default,
    input.min ?? Number.NEGATIVE_INFINITY,
    input.max ?? Number.POSITIVE_INFINITY,
  );
}

function readInputValues(
  canvas: HTMLCanvasElement,
  config: ShaderRuntimeConfig,
  root: HTMLElement,
): ShaderInputValues {
  return Object.fromEntries(
    Object.entries(config.inputs ?? {}).map(([name, input]) => [
      name,
      readInputValue(canvas, input, root),
    ]),
  );
}

function normalizeInputValue(
  value: ShaderInputValue,
  input: ShaderInputDefinition,
): ShaderInputValue | null {
  if (input.type === "color") {
    if (!Array.isArray(value) || value.length !== 3) return null;

    return [
      clampNumber(Number(value[0]), 0, 1),
      clampNumber(Number(value[1]), 0, 1),
      clampNumber(Number(value[2]), 0, 1),
    ];
  }

  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  return clampNumber(
    value,
    input.min ?? Number.NEGATIVE_INFINITY,
    input.max ?? Number.POSITIVE_INFINITY,
  );
}

function mergeInputPatch(
  currentValues: ShaderInputValues,
  patch: Partial<ShaderInputValues>,
  config: ShaderRuntimeConfig,
): ShaderInputValues {
  const nextValues = { ...currentValues };

  Object.entries(patch).forEach(([name, value]) => {
    const input = config.inputs?.[name];
    if (!input || value === undefined) return;

    const normalizedValue = normalizeInputValue(value, input);
    if (normalizedValue === null) return;

    nextValues[name] = normalizedValue;
  });

  return nextValues;
}

function getObservedAttributes(config: ShaderRuntimeConfig) {
  return Array.from(
    new Set([
      ...baseObservedAttributes,
      ...Object.values(config.inputs ?? {}).map((input) => input.attribute),
    ]),
  );
}

function hasColorInputs(config: ShaderRuntimeConfig) {
  return Object.values(config.inputs ?? {}).some((input) => input.type === "color");
}

function hasDynamicCssColor(value: string | undefined) {
  return value ? /\bvar\(/i.test(value) : false;
}

function hasDynamicColorInputValues(canvas: HTMLCanvasElement, config: ShaderRuntimeConfig) {
  return Object.values(config.inputs ?? {}).some(
    (input) =>
      input.type === "color" && hasDynamicCssColor(canvas.getAttribute(input.attribute) ?? ""),
  );
}

function isDarkTheme(root: HTMLElement) {
  return (
    root.classList.contains("dark") ||
    Boolean(root.closest(".dark")) ||
    document.documentElement.classList.contains("dark")
  );
}

function readNearestCssColor(
  root: HTMLElement,
  property: "backgroundColor" | "color",
): ShaderColor | null {
  let current: HTMLElement | null = root;

  while (current) {
    const parsedColor = parseCssRgb(window.getComputedStyle(current)[property]);
    if (parsedColor) return parsedColor;

    current = current.parentElement;
  }

  return parseCssRgb(window.getComputedStyle(document.documentElement)[property]);
}

function readOptions(canvas: HTMLCanvasElement, config: ShaderRuntimeConfig): ShaderOptions {
  const defaults = { ...defaultShaderOptions, ...config.defaults };

  return {
    maxDpr: readNumber(canvas.dataset.shaderMaxDpr, defaults.maxDpr, 1, 2),
    maxFps: readNumber(canvas.dataset.shaderMaxFps, defaults.maxFps, 1, 60),
    pointerEnabled: readBoolean(
      canvas.dataset.shaderPointerEnabled,
      defaults.pointerEnabled ?? true,
    ),
  };
}

export function createRawShaderBackground(
  canvas: HTMLCanvasElement,
  config: ShaderRuntimeConfig,
): ShaderHandle | null {
  const existing = instances.get(canvas);
  if (existing) return existing;

  const root = canvas.closest<HTMLElement>(config.rootSelector);
  if (!root) return null;

  const background = new ShaderBackground(root, canvas, config, () => {
    instances.delete(canvas);
  });

  instances.set(canvas, background);
  (canvas as ShaderCanvas).__starwindShaderHandle = background;
  return background;
}

export function initRawShaderBackgrounds(
  canvasSelector: string,
  factory: (canvas: HTMLCanvasElement) => ShaderHandle | null,
) {
  document.querySelectorAll<HTMLCanvasElement>(canvasSelector).forEach((canvas) => factory(canvas));
}

class ShaderBackground implements ShaderHandle {
  private disposed = false;
  private fallbackTimeoutId: number | null = null;
  private frameId: number | null = null;
  private gl: WebGLRenderingContext | null = null;
  private hasRevealedFirstFrame = false;
  private inputLocations: Record<string, WebGLUniformLocation | null> = {};
  private inputValues: ShaderInputValues;
  private inViewport = true;
  private intersectionObserver: IntersectionObserver | null = null;
  private lastDraw = 0;
  private locations: Record<string, WebGLUniformLocation | null> = {};
  private mutationObserver: MutationObserver | null = null;
  private options: ShaderOptions;
  private pendingDatasetRefresh = false;
  private pointerActive = 0;
  private pointerStartedAt = -10000;
  private pointerTarget: HTMLElement | null = null;
  private pointerX = 0.5;
  private pointerY = 0.5;
  private positionBuffer: WebGLBuffer | null = null;
  private program: WebGLProgram | null = null;
  private revealFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeoutId: number | null = null;
  private startedAt = performance.now();
  private startupTimedOut = false;
  private themeBackground: ShaderColor = [1, 1, 1];
  private themeForeground: ShaderColor = [0.09, 0.09, 0.11];
  private themeIsDark = 0;
  private themeObserver: MutationObserver | null = null;
  private pendingThemeRefresh = false;
  private handleNavigation = () => this.dispose();

  constructor(
    private root: HTMLElement,
    private canvas: HTMLCanvasElement,
    private config: ShaderRuntimeConfig,
    private onDispose: () => void,
  ) {
    this.options = readOptions(canvas, config);
    this.inputValues = readInputValues(canvas, config, root);
    this.root.dataset.shaderState = "loading";
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
    document.addEventListener("astro:before-swap", this.handleNavigation);
    if (this.config.enableThemeColors) this.refreshThemeColors();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Reduced-motion previews use the CSS fallback instead of drawing an animated canvas.
      this.setFallback();
      return;
    }

    this.gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      stencil: false,
    });

    if (!this.gl || !this.setupProgram()) {
      this.setFallback();
      return;
    }

    this.observeDataset();
    this.observePointer();
    this.observeSize();
    this.observeTheme();
    this.observeVisibility();
    this.resizeNow();
    this.updateLoop();
  }

  update(patch: ShaderUpdate) {
    const previousMaxDpr = this.options.maxDpr;

    this.options = {
      maxDpr: patch.maxDpr === undefined ? this.options.maxDpr : clampNumber(patch.maxDpr, 1, 2),
      maxFps: patch.maxFps === undefined ? this.options.maxFps : clampNumber(patch.maxFps, 1, 60),
      pointerEnabled: patch.pointerEnabled ?? this.options.pointerEnabled,
    };
    if (patch.inputs)
      this.inputValues = mergeInputPatch(this.inputValues, patch.inputs, this.config);

    if (this.options.maxDpr !== previousMaxDpr) this.scheduleResize();
    if (this.shouldAnimate()) this.draw(performance.now());
  }

  refreshFromDataset() {
    this.inputValues = readInputValues(this.canvas, this.config, this.root);
    this.update(readOptions(this.canvas, this.config));
  }

  private setFallback() {
    this.clearRevealWatchdog();
    this.stopLoop();
    if (this.revealFrameId !== null) {
      cancelAnimationFrame(this.revealFrameId);
      this.revealFrameId = null;
    }
    this.root.dataset.shaderState = "fallback";
  }

  private clearRevealWatchdog() {
    if (this.fallbackTimeoutId === null) return;
    window.clearTimeout(this.fallbackTimeoutId);
    this.fallbackTimeoutId = null;
  }

  private scheduleRevealWatchdog() {
    if (
      this.fallbackTimeoutId !== null ||
      this.hasRevealedFirstFrame ||
      this.startupTimedOut ||
      !this.shouldAnimate()
    )
      return;

    this.fallbackTimeoutId = window.setTimeout(
      this.handleRevealWatchdog,
      this.config.fallbackTimeoutMs ?? defaultFallbackTimeoutMs,
    );
  }

  private handleRevealWatchdog = () => {
    this.fallbackTimeoutId = null;

    if (this.disposed || this.hasRevealedFirstFrame) return;

    if (this.shouldAnimate()) {
      this.startupTimedOut = true;
      this.setFallback();
    }
  };

  private revealAfterFirstFrame() {
    if (this.hasRevealedFirstFrame || this.revealFrameId !== null) return;

    this.revealFrameId = requestAnimationFrame(() => {
      this.revealFrameId = null;
      if (!this.shouldAnimate() || this.root.dataset.shaderState === "fallback") return;

      this.hasRevealedFirstFrame = true;
      this.clearRevealWatchdog();
      this.root.dataset.shaderState = "running";
    });
  }

  private compileShader(type: number, source: string) {
    const gl = this.gl;
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Shader compile failed", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private setupProgram() {
    const gl = this.gl;
    if (!gl) return false;

    for (const extensionName of this.config.requiredExtensions ?? []) {
      if (gl.getExtension(extensionName)) continue;

      console.warn(`Required WebGL extension unavailable: ${extensionName}`);
      return false;
    }

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, this.config.fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return false;

    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Shader link failed", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return false;
    }

    this.program = program;
    gl.useProgram(program);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.locations = {
      pointer: gl.getUniformLocation(program, "uPointer"),
      pointerActive: gl.getUniformLocation(program, "uPointerActive"),
      pointerAge: gl.getUniformLocation(program, "uPointerAge"),
      resolution: gl.getUniformLocation(program, "uResolution"),
      themeBackground: gl.getUniformLocation(program, "uThemeBackground"),
      themeForeground: gl.getUniformLocation(program, "uThemeForeground"),
      themeIsDark: gl.getUniformLocation(program, "uThemeIsDark"),
      time: gl.getUniformLocation(program, "uTime"),
    };
    this.inputLocations = Object.fromEntries(
      Object.entries(this.config.inputs ?? {}).map(([name, input]) => [
        name,
        gl.getUniformLocation(program, input.uniform),
      ]),
    );

    this.config.onProgramReady?.({
      canvas: this.canvas,
      gl,
      program,
      root: this.root,
    });

    return true;
  }

  private observeDataset() {
    this.mutationObserver = new MutationObserver(() => this.scheduleDatasetRefresh());
    this.mutationObserver.observe(this.canvas, {
      attributeFilter: getObservedAttributes(this.config),
      attributes: true,
    });
  }

  private observeSize() {
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", this.scheduleResize, { passive: true });
      return;
    }

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(this.root);
  }

  private observePointer() {
    if (!this.config.enablePointer || !("PointerEvent" in window)) return;

    this.pointerTarget = this.root.parentElement ?? this.root;

    if (this.config.pointerMode === "click") {
      this.pointerTarget.addEventListener("pointerdown", this.handlePointerClick, {
        passive: true,
      });
      return;
    }

    this.pointerTarget.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    this.pointerTarget.addEventListener("pointerdown", this.handlePointerMove, { passive: true });
    this.pointerTarget.addEventListener("pointerenter", this.handlePointerMove, { passive: true });
    this.pointerTarget.addEventListener("pointerleave", this.handlePointerLeave, { passive: true });
    this.pointerTarget.addEventListener("pointercancel", this.handlePointerLeave, {
      passive: true,
    });
  }

  private observeVisibility() {
    document.addEventListener("visibilitychange", this.updateLoop, { passive: true });
    window.addEventListener("focus", this.handleResume, { passive: true });
    window.addEventListener("pageshow", this.handleResume, { passive: true });

    if (!("IntersectionObserver" in window)) return;

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.inViewport = Boolean(entry?.isIntersecting);
        this.updateLoop();
      },
      { rootMargin: "160px" },
    );

    this.intersectionObserver.observe(this.root);
  }

  private observeTheme() {
    const shouldObserveTheme = this.config.enableThemeColors || hasColorInputs(this.config);
    if (!shouldObserveTheme || !("MutationObserver" in window)) return;

    this.themeObserver = new MutationObserver(this.scheduleThemeRefresh);
    for (let scope: HTMLElement | null = this.root; scope; scope = scope.parentElement) {
      this.themeObserver.observe(scope, {
        attributeFilter: ["class", "data-theme", "style"],
        attributes: true,
      });
    }
    document.addEventListener("starwind:theme-preview-change", this.scheduleThemeRefresh);
  }

  private scheduleThemeRefresh = () => {
    if (this.pendingThemeRefresh || this.disposed) return;
    this.pendingThemeRefresh = true;
    queueMicrotask(() => {
      this.pendingThemeRefresh = false;
      if (this.disposed) return;
      if (this.config.enableThemeColors) this.refreshThemeColors();
      if (hasDynamicColorInputValues(this.canvas, this.config))
        this.inputValues = readInputValues(this.canvas, this.config, this.root);
      if (this.shouldAnimate()) this.draw(performance.now());
    });
  };

  private refreshThemeColors() {
    const dark = isDarkTheme(this.root);

    this.themeIsDark = dark ? 1 : 0;
    this.themeBackground =
      readNearestCssColor(this.root, "backgroundColor") ?? (dark ? [0.02, 0.02, 0.03] : [1, 1, 1]);
    this.themeForeground =
      readNearestCssColor(this.root, "color") ?? (dark ? [0.94, 0.94, 0.96] : [0.08, 0.08, 0.1]);
  }

  private scheduleDatasetRefresh = () => {
    if (this.pendingDatasetRefresh) return;
    this.pendingDatasetRefresh = true;

    queueMicrotask(() => {
      this.pendingDatasetRefresh = false;
      if (!this.disposed) this.refreshFromDataset();
    });
  };

  private shouldAnimate() {
    return (
      !this.disposed &&
      this.program !== null &&
      this.root.isConnected &&
      document.visibilityState === "visible" &&
      this.inViewport
    );
  }

  private updateLoop = () => {
    if (this.shouldAnimate()) {
      if (this.startupTimedOut) {
        this.startupTimedOut = false;
        this.root.dataset.shaderState = "loading";
        // Fallback CSS can hide the canvas. Measure again after showing it.
        this.resizeNow();
      }
      this.scheduleRevealWatchdog();
      this.startLoop();
      return;
    }

    this.clearRevealWatchdog();
    this.stopLoop();

    if (!this.root.isConnected) this.dispose();
  };

  private handleResume = () => {
    // A background browser can suspend frames while the document stays visible.
    this.clearRevealWatchdog();
    this.updateLoop();
  };

  private startLoop() {
    if (this.frameId !== null || this.startupTimedOut || !this.shouldAnimate()) return;
    this.frameId = requestAnimationFrame(this.render);
  }

  private stopLoop() {
    if (this.frameId === null) return;
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  private scheduleResize = () => {
    if (this.resizeTimeoutId !== null) window.clearTimeout(this.resizeTimeoutId);
    this.resizeTimeoutId = window.setTimeout(this.resizeNow, 50);
  };

  private resizeNow = () => {
    this.resizeTimeoutId = null;

    const gl = this.gl;
    if (!gl) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.options.maxDpr);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      gl.viewport(0, 0, width, height);
      if (this.shouldAnimate()) this.draw(performance.now());
    }
  };

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.setFallback();
    this.dispose();
  };

  private updatePointerFromEvent(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    this.pointerX = clampNumber((event.clientX - rect.left) / rect.width, 0, 1);
    this.pointerY = clampNumber(1 - (event.clientY - rect.top) / rect.height, 0, 1);

    return true;
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.updatePointerFromEvent(event)) return;

    this.pointerActive = 1;

    if (this.shouldAnimate()) this.startLoop();
  };

  private handlePointerClick = (event: PointerEvent) => {
    if (!this.updatePointerFromEvent(event)) return;

    this.pointerActive = 1;
    this.pointerStartedAt = performance.now();

    if (this.shouldAnimate()) this.startLoop();
  };

  private handlePointerLeave = () => {
    this.pointerActive = 0;
    if (this.shouldAnimate()) this.startLoop();
  };

  private render = (now: number) => {
    this.frameId = null;

    if (!this.shouldAnimate()) {
      this.updateLoop();
      return;
    }

    const frameInterval = 1000 / Math.max(this.options.maxFps, 1);
    if (now - this.lastDraw >= frameInterval - 0.5) {
      this.draw(now);
      this.lastDraw = now;
    }

    this.startLoop();
  };

  private draw(now: number) {
    const gl = this.gl;
    if (!gl || !this.program || this.startupTimedOut) return;

    gl.useProgram(this.program);
    const pointerAge =
      this.pointerStartedAt > 0 ? Math.max(0, (now - this.pointerStartedAt) / 1000) : 999;
    const pointerActive =
      this.config.pointerMode === "click"
        ? this.pointerActive * (pointerAge <= 3 ? 1 : 0)
        : this.pointerActive;
    const enabledPointerActive = this.options.pointerEnabled === false ? 0 : pointerActive;

    gl.uniform2f(this.locations.resolution, this.canvas.width, this.canvas.height);
    const elapsedTime = (now - this.startedAt) / 1000;
    gl.uniform1f(this.locations.time, elapsedTime);
    gl.uniform2f(this.locations.pointer, this.pointerX, this.pointerY);
    gl.uniform1f(this.locations.pointerActive, enabledPointerActive);
    gl.uniform1f(this.locations.pointerAge, pointerAge);
    gl.uniform3f(
      this.locations.themeBackground,
      this.themeBackground[0],
      this.themeBackground[1],
      this.themeBackground[2],
    );
    gl.uniform3f(
      this.locations.themeForeground,
      this.themeForeground[0],
      this.themeForeground[1],
      this.themeForeground[2],
    );
    gl.uniform1f(this.locations.themeIsDark, this.themeIsDark);
    this.uploadDeclaredInputs(gl);
    this.config.onBeforeDraw?.({
      canvas: this.canvas,
      elapsedTime,
      gl,
      now,
      program: this.program,
      root: this.root,
    });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.revealAfterFirstFrame();
  }

  private uploadDeclaredInputs(gl: WebGLRenderingContext) {
    Object.entries(this.config.inputs ?? {}).forEach(([name, input]) => {
      const location = this.inputLocations[name];
      const value = this.inputValues[name] ?? input.default;

      if (input.type === "color") {
        const color = Array.isArray(value) ? value : input.default;
        gl.uniform3f(location, color[0], color[1], color[2]);
        return;
      }

      gl.uniform1f(location, typeof value === "number" ? value : input.default);
    });
  }

  dispose() {
    if (this.disposed) return;

    this.disposed = true;
    this.stopLoop();
    if (this.resizeTimeoutId !== null) window.clearTimeout(this.resizeTimeoutId);
    this.clearRevealWatchdog();
    if (this.revealFrameId !== null) cancelAnimationFrame(this.revealFrameId);
    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();
    document.removeEventListener("starwind:theme-preview-change", this.scheduleThemeRefresh);
    document.removeEventListener("astro:before-swap", this.handleNavigation);
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.pointerTarget?.removeEventListener("pointermove", this.handlePointerMove);
    this.pointerTarget?.removeEventListener("pointerdown", this.handlePointerMove);
    this.pointerTarget?.removeEventListener("pointerdown", this.handlePointerClick);
    this.pointerTarget?.removeEventListener("pointerenter", this.handlePointerMove);
    this.pointerTarget?.removeEventListener("pointerleave", this.handlePointerLeave);
    this.pointerTarget?.removeEventListener("pointercancel", this.handlePointerLeave);
    document.removeEventListener("visibilitychange", this.updateLoop);
    window.removeEventListener("focus", this.handleResume);
    window.removeEventListener("pageshow", this.handleResume);
    window.removeEventListener("resize", this.scheduleResize);

    if (this.gl) {
      if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }

    this.config.onDispose?.();
    delete (this.canvas as ShaderCanvas).__starwindShaderHandle;
    this.onDispose();
  }
}
