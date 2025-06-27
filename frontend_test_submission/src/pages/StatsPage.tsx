import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from "@mui/material";

interface ClickDetail {
  timestamp: string;
  source?: string;
  geo?: string;
}

interface UrlStats {
  shortcode: string;
  originalUrl: string;
  createdAt: string;
  expiry: string;
  clickCount: number;
  clickDetails: ClickDetail[];
}

const getShortcodesFromSession = (): string[] => {
  // Optionally, you could store shortcodes in localStorage/sessionStorage when creating URLs
  // For now, we will just use a placeholder or fetch from backend if persistent
  const codes = sessionStorage.getItem("shortcodes");
  return codes ? JSON.parse(codes) : [];
};

const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<UrlStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const codes = getShortcodesFromSession();
      const promises = codes.map(async (code: string) => {
        try {
          const res = await fetch(`http://localhost:4000/shorturls/${code}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data;
        } catch {
          return null;
        }
      });
      const results = (await Promise.all(promises)).filter(
        Boolean
      ) as UrlStats[];
      setStats(results);
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Shortened URL Statistics
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : stats.length === 0 ? (
          <Typography>No stats to display. Shorten some URLs first.</Typography>
        ) : (
          <List>
            {stats.map((stat, idx) => (
              <React.Fragment key={stat.shortcode}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={
                      <>
                        <Typography variant="subtitle1">
                          <b>Shortcode:</b> {stat.shortcode}
                        </Typography>
                        <Typography variant="body2">
                          <b>Original URL:</b> {stat.originalUrl}
                        </Typography>
                        <Typography variant="body2">
                          <b>Created:</b> {stat.createdAt}
                        </Typography>
                        <Typography variant="body2">
                          <b>Expiry:</b> {stat.expiry}
                        </Typography>
                        <Typography variant="body2">
                          <b>Clicks:</b> {stat.clickCount}
                        </Typography>
                      </>
                    }
                    secondary={
                      stat.clickDetails.length > 0 ? (
                        <>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <b>Click Details:</b>
                          </Typography>
                          <List dense>
                            {stat.clickDetails.map((click, cidx) => (
                              <ListItem key={cidx}>
                                <ListItemText
                                  primary={`Time: ${click.timestamp}`}
                                  secondary={`Source: ${
                                    click.source || "N/A"
                                  }, Geo: ${click.geo || "N/A"}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      ) : (
                        <Typography variant="body2">No clicks yet.</Typography>
                      )
                    }
                  />
                </ListItem>
                {idx < stats.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default StatsPage;
