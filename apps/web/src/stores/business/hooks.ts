/**
 * Typed Redux Hooks
 * ==================
 * Pre-typed versions of useDispatch and useSelector.
 *
 * Usage:
 * ```tsx
 * import { useAppDispatch, useAppSelector } from "~/stores/business/hooks";
 *
 * const dispatch = useAppDispatch();
 * const user = useAppSelector((state) => state.auth.user);
 * ```
 */

import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
