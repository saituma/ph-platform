import "@testing-library/jest-dom";

import { TextEncoder, TextDecoder } from "node:util";
import { ReadableStream, WritableStream } from "node:stream/web";

if (!globalThis.TextEncoder) {
  // @ts-ignore - assign to global in test env
  globalThis.TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
  // @ts-ignore - assign to global in test env
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
if (!globalThis.ReadableStream) {
  // @ts-ignore - assign to global in test env
  globalThis.ReadableStream = ReadableStream;
}
if (!globalThis.WritableStream) {
  // @ts-ignore - assign to global in test env
  globalThis.WritableStream = WritableStream;
}

// Load undici after streams and TextEncoder are available.
const { Headers, Request, Response } = require("undici");

if (!globalThis.Headers) {
  // @ts-ignore - assign to global in test env
  globalThis.Headers = Headers;
}
if (!globalThis.Request) {
  // @ts-ignore - assign to global in test env
  globalThis.Request = Request;
}
if (!globalThis.Response) {
  // @ts-ignore - assign to global in test env
  globalThis.Response = Response;
}
