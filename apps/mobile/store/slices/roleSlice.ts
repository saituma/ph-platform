import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type RoleType = "Guardian" | "Athlete";

interface RoleState {
  role: RoleType;
  guardianPin: string | null;
}

const initialState: RoleState = {
  role: "Guardian",
  guardianPin: null,
};

const roleSlice = createSlice({
  name: "role",
  initialState,
  reducers: {
    setRole: (state, action: PayloadAction<RoleType>) => {
      state.role = action.payload;
    },
    setGuardianPin: (state, action: PayloadAction<string | null>) => {
      state.guardianPin = action.payload;
    },
  },
});

export const { setRole, setGuardianPin } = roleSlice.actions;

export const selectRole = (state: { role: RoleState }) => state.role.role;
export const selectGuardianPin = (state: { role: RoleState }) =>
  state.role.guardianPin;
export const checkPin =
  (pin: string) =>
  (state: { role: RoleState }): boolean => {
    if (!state.role.guardianPin) return true;
    return state.role.guardianPin === pin;
  };

export default roleSlice.reducer;
