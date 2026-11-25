import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir: string = dirname(fileURLToPath(import.meta.url));
const srcPath: string = join(dir, "entry.png");
const outDir: string = process.env.MAKEFUN_OUTPUT_DIR || "output";
const outPath: string = join(outDir, "entry.png");

const PNG_MAGIC: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_SIZE: number = 1024 * 1024;

function md5(data: Buffer): string {
  return createHash("md5").update(data).digest("hex");
}

function fail(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

// Validate the PNG IHDR chunk: entry must be a 1024x1024 front page.
function checkDimensions(data: Buffer): void {
  if (data.length < 24) {
    fail(`PNG too short for IHDR: ${data.length} bytes`);
  }
  const width: number = data.readUInt32BE(16);
  const height: number = data.readUInt32BE(20);
  if (width !== 1024 || height !== 1024) {
    fail(`unexpected PNG dimensions: ${width}x${height} (expected 1024x1024)`);
  }
  console.log(`dimensions: ${width}x${height}`);
}

if (!existsSync(srcPath)) {
  fail(`source not found: ${srcPath}`);
}

const src: Buffer = readFileSync(srcPath);

if (src.length < 8) {
  fail(`source too small: ${src.length} bytes`);
}

for (let i = 0; i < PNG_MAGIC.length; i++) {
  if (src[i] !== PNG_MAGIC[i]) {
    fail("invalid PNG magic bytes");
  }
}

if (src.length === 0 || src.length >= MAX_SIZE) {
  fail(`source size out of range: ${src.length} bytes (must be > 0 and < 1 MiB)`);
}

checkDimensions(src);

const srcMd5: string = md5(src);
const srcSize: number = statSync(srcPath).size;

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, src);

const written: Buffer = readFileSync(outPath);
const outMd5: string = md5(written);

if (written.length !== src.length || outMd5 !== srcMd5) {
  fail(`verification failed: src md5=${srcMd5} out md5=${outMd5}`);
}

console.log(`source: ${srcPath} (${srcSize} bytes, md5=${srcMd5})`);
console.log(`output: ${outPath} (${written.length} bytes, md5=${outMd5})`);
console.log("verified byte-identical");
