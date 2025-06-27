import express from "express";
import { loggingMiddleware, Log } from "../../logging_middleware/logger";
import { urlStore, UrlEntry } from "./urlStore";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());
app.use(loggingMiddleware);

// Helper: Validate URL
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Helper: Generate unique shortcode
function generateShortcode(length = 6): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  do {
    code = Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (urlStore[code]);
  return code;
}

// Async handler wrapper for Express v5
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get("/", (req, res) => {
  res.send("URL Shortener Backend is running!");
});

app.post(
  "/shorturls",
  asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { url, validity, shortcode } = req.body;
        // Input validation
        if (!url || typeof url !== "string" || !isValidUrl(url)) {
          await Log("backend", "error", "handler", "Invalid or missing URL");
          res.status(400).json({ error: "Invalid or missing URL" });
          return;
        }
        let code = shortcode;
        if (code) {
          if (typeof code !== "string" || !/^[a-zA-Z0-9]{3,}$/.test(code)) {
            await Log(
              "backend",
              "error",
              "handler",
              "Invalid shortcode format"
            );
            res.status(400).json({ error: "Invalid shortcode format" });
            return;
          }
          if (urlStore[code]) {
            await Log(
              "backend",
              "error",
              "handler",
              "Shortcode already exists"
            );
            res.status(409).json({ error: "Shortcode already exists" });
            return;
          }
        } else {
          code = generateShortcode();
        }
        // Validity
        let minutes = 30;
        if (validity !== undefined) {
          if (typeof validity !== "number" || validity <= 0) {
            await Log("backend", "error", "handler", "Invalid validity");
            res.status(400).json({ error: "Invalid validity" });
            return;
          }
          minutes = validity;
        }
        const now = new Date();
        const expiry = new Date(now.getTime() + minutes * 60000).toISOString();
        const entry: UrlEntry = {
          originalUrl: url,
          shortcode: code,
          createdAt: now.toISOString(),
          expiry,
          clickCount: 0,
          clickDetails: [],
        };
        urlStore[code] = entry;
        await Log("backend", "info", "handler", `Short URL created: ${code}`);
        res.status(201).json({
          shortLink: `${req.protocol}://${req.get("host")}/${code}`,
          expiry,
        });
      } catch (err) {
        await Log("backend", "error", "handler", "Internal server error");
        res.status(500).json({ error: "Internal server error" });
      }
    }
  )
);

// GET /shorturls/:shortcode - Retrieve stats for a short URL
app.get(
  "/shorturls/:shortcode",
  asyncHandler(async (req: Request, res: Response) => {
    const { shortcode } = req.params;
    const entry = urlStore[shortcode];
    if (!entry) {
      await Log("backend", "error", "handler", "Shortcode not found");
      res.status(404).json({ error: "Shortcode not found" });
      return;
    }
    // Expiry check
    if (new Date(entry.expiry) < new Date()) {
      await Log("backend", "warn", "handler", "Shortcode expired");
      res.status(410).json({ error: "Shortcode expired" });
      return;
    }
    res.json({
      shortcode: entry.shortcode,
      originalUrl: entry.originalUrl,
      createdAt: entry.createdAt,
      expiry: entry.expiry,
      clickCount: entry.clickCount,
      clickDetails: entry.clickDetails,
    });
  })
);

// GET /:shortcode - Redirect to original URL and track click
app.get(
  "/:shortcode",
  asyncHandler(async (req: Request, res: Response) => {
    const { shortcode } = req.params;
    const entry = urlStore[shortcode];
    if (!entry) {
      await Log("backend", "error", "route", "Shortcode not found");
      res.status(404).json({ error: "Shortcode not found" });
      return;
    }
    // Expiry check
    if (new Date(entry.expiry) < new Date()) {
      await Log("backend", "warn", "route", "Shortcode expired");
      res.status(410).json({ error: "Shortcode expired" });
      return;
    }
    // Track click
    entry.clickCount++;
    entry.clickDetails.push({
      timestamp: new Date().toISOString(),
      source: req.get("referer") || undefined,
      geo: req.ip, // For demo, just use IP as geo
    });
    await Log("backend", "info", "route", `Shortcode ${shortcode} clicked`);
    res.redirect(entry.originalUrl);
  })
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
