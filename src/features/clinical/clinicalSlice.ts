import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  clearSmartSession,
  connectDemoClient,
  loadClinicalSummary,
  readySmartClient,
} from "../../services/smartClient";
import type { ClinicalSummary } from "../../types/fhir";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface ClinicalState {
  status: LoadStatus;
  mode: "smart" | "demo" | null;
  error: string | null;
  summary: ClinicalSummary | null;
}

const initialState: ClinicalState = {
  status: "idle",
  mode: null,
  error: null,
  summary: null,
};

export const startSmartSession = createAsyncThunk<ClinicalSummary, void, { rejectValue: string }>(
  "clinical/startSmartSession",
  async (_, { rejectWithValue }) => {
    try {
      await readySmartClient();
      return await loadClinicalSummary("smart");
    } catch (error) {
      return rejectWithValue(messageFromError(error));
    }
  },
);

export const startDemoSession = createAsyncThunk<ClinicalSummary, void, { rejectValue: string }>(
  "clinical/startDemoSession",
  async (_, { rejectWithValue }) => {
    try {
      connectDemoClient();
      return await loadClinicalSummary("demo");
    } catch (error) {
      return rejectWithValue(messageFromError(error));
    }
  },
);

export const refreshClinicalSummary = createAsyncThunk<ClinicalSummary, void, { rejectValue: string }>(
  "clinical/refreshClinicalSummary",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { clinical: ClinicalState };
      return await loadClinicalSummary(state.clinical.mode ?? "demo");
    } catch (error) {
      return rejectWithValue(messageFromError(error));
    }
  },
);

export const endClinicalSession = createAsyncThunk("clinical/endClinicalSession", async () => {
  await clearSmartSession();
});

const clinicalSlice = createSlice({
  name: "clinical",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(startSmartSession.pending, (state) => {
        state.status = "loading";
        state.mode = "smart";
        state.error = null;
      })
      .addCase(startSmartSession.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.summary = action.payload;
        state.mode = "smart";
      })
      .addCase(startSmartSession.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? action.error.message ?? "SMART launch failed.";
      })
      .addCase(startDemoSession.pending, (state) => {
        state.status = "loading";
        state.mode = "demo";
        state.error = null;
      })
      .addCase(startDemoSession.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.summary = action.payload;
        state.mode = "demo";
      })
      .addCase(startDemoSession.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? action.error.message ?? "Demo FHIR request failed.";
      })
      .addCase(refreshClinicalSummary.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(refreshClinicalSummary.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.summary = action.payload;
      })
      .addCase(refreshClinicalSummary.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? action.error.message ?? "Refresh failed.";
      })
      .addCase(endClinicalSession.fulfilled, () => initialState);
  },
});

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

export default clinicalSlice.reducer;
