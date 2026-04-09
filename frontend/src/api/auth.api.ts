import api from "./axios";

export const loginUser = (email: string, password: string) =>
  api.post("/auth/login", { email, password });

export const setPassword = (email: string, password: string) =>
  api.post("/auth/set-password", { email, password });

export const registerUser = (data: {
  name: string;
  email: string;
  role: string;
  warehouse_id?: string;
}) =>
  api.post("/users", data);
