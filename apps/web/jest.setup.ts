import "@testing-library/jest-dom";

import { TextEncoder, TextDecoder } from "node:util";
import { ReadableStream, WritableStream } from "node:stream/web";

if (!globalThis.TextEncoder) {
  // @ts-expect-error - assign to global in test env
  globalThis.TextEncoder = TextEncoder;
}
if (!globalThis.TextDecoder) {
  // @ts-expect-error - assign to global in test env
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
if (!globalThis.ReadableStream) {
  // @ts-expect-error - assign to global in test env
  globalThis.ReadableStream = ReadableStream;
}
if (!globalThis.WritableStream) {
  // @ts-expect-error - assign to global in test env
  globalThis.WritableStream = WritableStream;
}

// Load undici after streams and TextEncoder are available.
const { Headers, Request, Response } = require("undici");

if (!globalThis.Headers) {
  // @ts-expect-error - assign to global in test env
  globalThis.Headers = Headers;
}
if (!globalThis.Request) {
  // @ts-expect-error - assign to global in test env
  globalThis.Request = Request;
}
if (!globalThis.Response) {
  // @ts-expect-error - assign to global in test env
  globalThis.Response = Response;
}
