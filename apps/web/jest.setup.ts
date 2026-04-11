import "@testing-library/jest-dom";
// React 19 requires this flag for act() to flush updates in tests.
// @ts-ignore - add to global for test env
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
const { Headers, Request, Response, fetch } = require("undici");

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

if (!globalThis.fetch) {
  // @ts-ignore - assign to global in test env
  globalThis.fetch = fetch;
}

if (!globalThis.crypto) {
  // @ts-ignore - assign to global in test env
  globalThis.crypto = {
    randomUUID: () => "00000000-0000-0000-0000-000000000000",
  };
}

if (!globalThis.AudioContext) {
  class MockAudioContext {
    state = "running";
    destination = {};
    resume = jest.fn(async () => {});
    decodeAudioData = jest.fn(async () => ({}));
    createBufferSource = () => ({
      buffer: null,
      playbackRate: { value: 1 },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null as null | (() => void),
    });
    createGain = () => ({
      gain: { value: 1 },
      connect: jest.fn(),
    });
  }

  // @ts-ignore - assign to global in test env
  globalThis.AudioContext = MockAudioContext;
  // @ts-ignore - assign to global in test env
  globalThis.webkitAudioContext = MockAudioContext;
}

jest.mock("@fullcalendar/react", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@fullcalendar/daygrid", () => ({}));
jest.mock("@fullcalendar/timegrid", () => ({}));
jest.mock("@fullcalendar/interaction", () => ({}));
