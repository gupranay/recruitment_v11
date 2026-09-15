declare module "heic-convert" {
  type OutputFormat = "JPEG" | "PNG";

  interface ConvertOptions {
    buffer: Buffer;
    format: OutputFormat;
    quality?: number;
  }

  type Convert = (options: ConvertOptions) => Promise<Buffer>;

  const convert: Convert;
  export = convert;
}
