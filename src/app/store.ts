import { configureStore } from "@reduxjs/toolkit";
import clinicalReducer from "../features/clinical/clinicalSlice";

export const store = configureStore({
  reducer: {
    clinical: clinicalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
