import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SocketState {
  isConnected: boolean;
  connectErrorCount: number;
  lastDisconnectReason: string | null;
}

const initialState: SocketState = {
  isConnected: false,
  connectErrorCount: 0,
  lastDisconnectReason: null,
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    socketConnected(state) {
      state.isConnected = true;
      state.connectErrorCount = 0;
      state.lastDisconnectReason = null;
    },
    socketDisconnected(state, action: PayloadAction<string>) {
      state.isConnected = false;
      state.lastDisconnectReason = action.payload;
    },
    socketConnectError(state) {
      state.connectErrorCount += 1;
    },
    socketReset(state) {
      state.isConnected = false;
      state.connectErrorCount = 0;
      state.lastDisconnectReason = null;
    },
  },
});

export const { socketConnected, socketDisconnected, socketConnectError, socketReset } =
  socketSlice.actions;

export default socketSlice.reducer;

export const selectSocketConnected = (state: { socket: SocketState }) =>
  state.socket.isConnected;

export const selectSocketConnectErrors = (state: { socket: SocketState }) =>
  state.socket.connectErrorCount;
