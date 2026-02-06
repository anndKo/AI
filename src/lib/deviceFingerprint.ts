/**
 * Advanced Device Fingerprinting
 * Tạo fingerprint duy nhất cho thiết bị dựa trên nhiều yếu tố
 */

interface FingerprintComponents {
  canvas: string;
  webgl: string;
  audio: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number | undefined;
  userAgent: string;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  plugins: string;
  fonts: string;
}

// Canvas fingerprint
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";

    canvas.width = 200;
    canvas.height = 50;

    // Draw text with various styles
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Canvas", 4, 17);

    // Add some shapes
    ctx.beginPath();
    ctx.arc(50, 25, 20, 0, Math.PI * 2);
    ctx.stroke();

    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

// WebGL fingerprint
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "no-webgl";

    const webglCtx = gl as WebGLRenderingContext;
    const debugInfo = webglCtx.getExtension("WEBGL_debug_renderer_info");
    
    const vendor = debugInfo ? webglCtx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "unknown";
    const renderer = debugInfo ? webglCtx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown";
    
    return `${vendor}|${renderer}`;
  } catch {
    return "webgl-error";
  }
}

// Audio fingerprint
function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        resolve("no-audio-context");
        return;
      }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // Mute
      oscillator.type = "triangle";
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      let fingerprint = "";
      scriptProcessor.onaudioprocess = (e) => {
        const output = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < output.length; i++) {
          sum += Math.abs(output[i]);
        }
        fingerprint = sum.toString();
        
        oscillator.disconnect();
        scriptProcessor.disconnect();
        gainNode.disconnect();
        context.close();
        resolve(fingerprint || "audio-processed");
      };

      oscillator.start(0);
      
      // Timeout fallback
      setTimeout(() => {
        if (!fingerprint) {
          resolve("audio-timeout");
        }
      }, 1000);
    } catch {
      resolve("audio-error");
    }
  });
}

// Screen fingerprint
function getScreenFingerprint(): string {
  return `${screen.width}x${screen.height}x${screen.colorDepth}|${screen.availWidth}x${screen.availHeight}`;
}

// Font detection (simplified)
function getFontsFingerprint(): string {
  const testFonts = [
    "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana",
    "Courier New", "Comic Sans MS", "Impact", "Trebuchet MS", "Lucida Console"
  ];
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "no-fonts";

  const baseFonts = ["monospace", "sans-serif", "serif"];
  const testString = "mmmmmmmmmmlli";
  const testSize = "72px";
  
  const getWidth = (font: string): number => {
    ctx.font = `${testSize} ${font}`;
    return ctx.measureText(testString).width;
  };

  const baseWidths = baseFonts.map(getWidth);
  const detected: string[] = [];

  testFonts.forEach((font, i) => {
    const width = getWidth(`'${font}', ${baseFonts[i % 3]}`);
    if (width !== baseWidths[i % 3]) {
      detected.push(font);
    }
  });

  return detected.join(",");
}

// Plugin fingerprint
function getPluginsFingerprint(): string {
  const plugins: string[] = [];
  for (let i = 0; i < navigator.plugins.length; i++) {
    plugins.push(navigator.plugins[i].name);
  }
  return plugins.join(",");
}

// Detect automation/bot
export function detectAutomation(): { isBot: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Check webdriver
  if ((navigator as any).webdriver) {
    reasons.push("webdriver");
  }
  
  // Check for automation properties
  const automationProps = [
    "_phantom", "__nightmare", "_selenium", "callPhantom",
    "callSelenium", "_Selenium_IDE_Recorder"
  ];
  
  automationProps.forEach(prop => {
    if ((window as any)[prop]) {
      reasons.push(prop);
    }
  });
  
  // Check for missing browser features
  if (!(window as any).chrome && navigator.userAgent.includes("Chrome")) {
    reasons.push("fake-chrome");
  }
  
  // Check for headless indicators
  if (navigator.plugins.length === 0) {
    reasons.push("no-plugins");
  }
  
  // Check for WebGL anomalies
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl");
  if (gl) {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer.includes("SwiftShader") || renderer.includes("llvmpipe")) {
        reasons.push("software-renderer");
      }
    }
  }
  
  // Check for DevTools (basic)
  const devToolsCheck = /./;
  devToolsCheck.toString = function() {
    reasons.push("devtools-open");
    return "";
  };
  
  return {
    isBot: reasons.length > 1, // Cần ít nhất 2 dấu hiệu để xác định là bot
    reasons
  };
}

// Hash function using SHA-256
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Main fingerprint generator
export async function generateFingerprint(): Promise<{
  hash: string;
  components: FingerprintComponents;
  metadata: {
    generatedAt: string;
    automationDetected: boolean;
    automationReasons: string[];
  };
}> {
  const audioFingerprint = await getAudioFingerprint();
  const automation = detectAutomation();
  
  const components: FingerprintComponents = {
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    audio: audioFingerprint,
    screen: getScreenFingerprint(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory,
    userAgent: navigator.userAgent,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    touchSupport: "ontouchstart" in window,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    plugins: getPluginsFingerprint(),
    fonts: getFontsFingerprint(),
  };

  // Create a stable string from components
  const fingerprintString = JSON.stringify({
    canvas: components.canvas.substring(0, 100), // Truncate for stability
    webgl: components.webgl,
    screen: components.screen,
    timezone: components.timezone,
    language: components.language,
    platform: components.platform,
    hardwareConcurrency: components.hardwareConcurrency,
    deviceMemory: components.deviceMemory,
    colorDepth: components.colorDepth,
    pixelRatio: components.pixelRatio,
    touchSupport: components.touchSupport,
    plugins: components.plugins,
    fonts: components.fonts,
  });

  const hash = await sha256(fingerprintString);

  return {
    hash,
    components,
    metadata: {
      generatedAt: new Date().toISOString(),
      automationDetected: automation.isBot,
      automationReasons: automation.reasons,
    },
  };
}

// Behavior tracking
export class BehaviorTracker {
  private keystrokes: number[] = [];
  private lastKeystroke: number = 0;
  private formFocusTime: number = 0;
  private mouseMovements: number = 0;

  start() {
    this.formFocusTime = Date.now();
    
    const handleKeyDown = () => {
      const now = Date.now();
      if (this.lastKeystroke > 0) {
        this.keystrokes.push(now - this.lastKeystroke);
      }
      this.lastKeystroke = now;
    };
    
    const handleMouseMove = () => {
      this.mouseMovements++;
    };
    
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }

  getScore(): number {
    let score = 0;
    
    // Time spent on form (suspicious if < 2 seconds)
    const timeSpent = Date.now() - this.formFocusTime;
    if (timeSpent < 2000) score -= 30;
    else if (timeSpent > 5000) score += 10;
    
    // Keystroke timing variance (bots often have very consistent timing)
    if (this.keystrokes.length > 3) {
      const avg = this.keystrokes.reduce((a, b) => a + b, 0) / this.keystrokes.length;
      const variance = this.keystrokes.reduce((sum, k) => sum + Math.pow(k - avg, 2), 0) / this.keystrokes.length;
      if (variance < 100) score -= 20; // Too consistent
      else if (variance > 1000) score += 10; // Natural human variance
    }
    
    // Mouse movements (no mouse = possible bot)
    if (this.mouseMovements === 0) score -= 20;
    else if (this.mouseMovements > 10) score += 10;
    
    return Math.max(-100, Math.min(100, score));
  }
}
