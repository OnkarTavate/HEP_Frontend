import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const wasmSource = path.join(projectRoot, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDest = path.join(projectRoot, "public", "mediapipe");
const selfieSource = path.join(projectRoot, "node_modules", "@mediapipe", "selfie_segmentation");
const selfieDest = path.join(projectRoot, "public", "mediapipe", "selfie_segmentation");
const modelDestDir = path.join(projectRoot, "public", "models");
const modelDest = path.join(modelDestDir, "face_landmarker.task");

const REQUIRED_WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_module_internal.js",
  "vision_wasm_module_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

const REQUIRED_SELFIE_FILES = [
  "selfie_segmentation.binarypb",
  "selfie_segmentation.js",
  "selfie_segmentation.tflite",
  "selfie_segmentation_landscape.tflite",
  "selfie_segmentation_solution_simd_wasm_bin.data",
  "selfie_segmentation_solution_simd_wasm_bin.js",
  "selfie_segmentation_solution_simd_wasm_bin.wasm",
  "selfie_segmentation_solution_wasm_bin.js",
  "selfie_segmentation_solution_wasm_bin.wasm",
];

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyRequiredFiles(sourceDir, destDir, files, label) {
  await fs.mkdir(destDir, { recursive: true });

  for (const fileName of files) {
    const src = path.join(sourceDir, fileName);
    const dst = path.join(destDir, fileName);

    if (!(await exists(src))) {
      throw new Error(`Missing ${label} file: ${src}`);
    }

    await fs.copyFile(src, dst);
  }

  console.log(`Copied ${files.length} ${label} files to ${path.relative(projectRoot, destDir)}`);
}

async function copyWasmAssets() {
  await copyRequiredFiles(wasmSource, wasmDest, REQUIRED_WASM_FILES, "MediaPipe runtime");
}

async function copySelfieSegmentationAssets() {
  await copyRequiredFiles(selfieSource, selfieDest, REQUIRED_SELFIE_FILES, "MediaPipe selfie segmentation");
}

async function ensureModelFile() {
  await fs.mkdir(modelDestDir, { recursive: true });

  if (await exists(modelDest)) {
    console.log("Model already exists at public/models/face_landmarker.task");
    return;
  }

  const response = await fetch(MODEL_URL);
  if (!response.ok) {
    throw new Error(`Failed to download model: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(modelDest, Buffer.from(arrayBuffer));
  console.log("Downloaded face_landmarker.task to public/models");
}

async function main() {
  await copyWasmAssets();
  await copySelfieSegmentationAssets();
  await ensureModelFile();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
