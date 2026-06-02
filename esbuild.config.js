import esbuild from "esbuild";

async function build() {
  try {
    await esbuild.build({
      entryPoints: ["server.ts"],
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node20",
      outfile: "dist/server.js",
      external: [
        // Exclude native or heavy modules that shouldn't be bundled
        "fsevents",
        "aws-sdk"
      ],
      banner: {
        // Necessary for ESM in Node when using __dirname or similar
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
      },
      sourcemap: true,
      minify: process.env.NODE_ENV === "production",
    });
    console.log("⚡ Server build complete: dist/server.js");
  } catch (err) {
    console.error("❌ Server build failed:", err);
    process.exit(1);
  }
}

build();
