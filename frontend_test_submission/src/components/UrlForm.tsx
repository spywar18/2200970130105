import React, { useState } from "react";
import { Box, Button, Grid, TextField, Typography, Paper } from "@mui/material";

interface UrlInput {
  url: string;
  validity?: string;
  shortcode?: string;
  error?: string;
}

interface ShortUrlResult {
  originalUrl: string;
  shortLink: string;
  expiry: string;
}

const initialInputs: UrlInput[] = Array.from({ length: 5 }, () => ({
  url: "",
}));

const UrlForm: React.FC = () => {
  const [inputs, setInputs] = useState<UrlInput[]>(initialInputs);
  const [results, setResults] = useState<ShortUrlResult[]>([]);
  const [loading, setLoading] = useState(false);

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleChange = (idx: number, field: keyof UrlInput, value: string) => {
    const newInputs = [...inputs];
    newInputs[idx][field] = value;
    setInputs(newInputs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    let valid = true;
    const newInputs = inputs.map((input) => {
      let error = "";
      if (input.url.trim() === "") return { ...input, error: "" };
      if (!validateUrl(input.url)) error = "Invalid URL";
      if (
        input.validity &&
        (!/^[0-9]+$/.test(input.validity) || parseInt(input.validity) <= 0)
      )
        error = "Validity must be a positive integer";
      if (input.shortcode && !/^[a-zA-Z0-9]{3,}$/.test(input.shortcode))
        error = "Shortcode must be alphanumeric, min 3 chars";
      if (error) valid = false;
      return { ...input, error };
    });
    setInputs(newInputs);
    if (!valid) {
      setLoading(false);
      return;
    }
    // Submit only non-empty URLs
    const promises = newInputs
      .filter((input) => input.url.trim() !== "")
      .map(async (input) => {
        try {
          const res = await fetch("http://localhost:4000/shorturls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: input.url,
              validity: input.validity ? parseInt(input.validity) : undefined,
              shortcode: input.shortcode || undefined,
            }),
          });
          const data = await res.json();
          if (res.status === 201) {
            return {
              originalUrl: input.url,
              shortLink: data.shortLink,
              expiry: data.expiry,
            };
          } else {
            return {
              originalUrl: input.url,
              shortLink: "Error: " + (data.error || "Unknown error"),
              expiry: "",
            };
          }
        } catch {
          return {
            originalUrl: input.url,
            shortLink: "Error: Network error",
            expiry: "",
          };
        }
      });
    const results = await Promise.all(promises);
    setResults(results);
    setLoading(false);
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Shorten up to 5 URLs
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {inputs.map((input, idx) => (
              <React.Fragment key={idx}>
                <Grid item xs={12} md={5}>
                  <TextField
                    label="Long URL"
                    value={input.url}
                    onChange={(e) => handleChange(idx, "url", e.target.value)}
                    fullWidth
                    error={!!input.error}
                    helperText={input.error}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Validity (min)"
                    value={input.validity || ""}
                    onChange={(e) =>
                      handleChange(idx, "validity", e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Shortcode (optional)"
                    value={input.shortcode || ""}
                    onChange={(e) =>
                      handleChange(idx, "shortcode", e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12}>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? "Shortening..." : "Shorten URLs"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
      {results.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Results
          </Typography>
          {results.map((result, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <Typography variant="body1">
                <b>Original:</b> {result.originalUrl}
              </Typography>
              <Typography variant="body2">
                <b>Short Link:</b> {result.shortLink}
              </Typography>
              {result.expiry && (
                <Typography variant="body2">
                  <b>Expiry:</b> {result.expiry}
                </Typography>
              )}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default UrlForm;
