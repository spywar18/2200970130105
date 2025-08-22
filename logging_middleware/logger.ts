import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";

const LOG_API_URL = "http://20.244.56.144/evaluation-service/logs";

export async function Log(
  stack: "backend" | "frontend",
  level: "debug" | "info" | "warn" | "error" | "fatal",
  pkg: string,
  message: string
) {
  try {
    const res = await fetch(LOG_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stack, level, package: pkg, message }),
    });
    
    return await res.json();
  } catch (err) {
    // Fallback: log to console if logging service fails
    console.error("Failed to log to evaluation service:", err);
  }
}


export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Example: Log method and URL
  // Replace this with your custom logging logic
  Log("backend", "info", "middleware", `${req.method} ${req.originalUrl}`);
  next();
}
