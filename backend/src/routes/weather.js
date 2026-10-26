import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const queryCity = req.query.city;
    const city =
      typeof queryCity === "string" && queryCity.trim()
        ? queryCity.trim()
        : "Chik Ballapur";

    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OpenWeather API key is missing",
      });
    }

    const url = (endpoint) =>
      `https://api.openweathermap.org/data/2.5/${endpoint}?${new URLSearchParams(
        {
          q: city,
          appid: apiKey,
          units: "metric",
        }
      )}`;

    const currentResponse = await fetch(url("weather"));

    if (!currentResponse.ok) {
      const details = await currentResponse.json();

      return res.status(currentResponse.status).json({
        error: "Could not fetch current weather",
        details,
      });
    }

    const current = await currentResponse.json();

    const forecastResponse = await fetch(url("forecast"));

    if (!forecastResponse.ok) {
      const details = await forecastResponse.json();

      return res.status(forecastResponse.status).json({
        error: "Could not fetch weather forecast",
        details,
      });
    }

    const forecast = await forecastResponse.json();

    return res.json({ current, forecast });
  } catch (error) {
    console.error("Weather API error:", error);

    return res.status(500).json({
      error: "Unable to fetch weather data",
    });
  }
});

export default router;