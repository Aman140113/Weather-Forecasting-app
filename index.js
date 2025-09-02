import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const port = 3000;
const app = express();
const API_URL = "https://api.openweathermap.org/data/2.5/forecast";
const apiKey = process.env.OPENWEATHER_API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index.ejs");
});


app.post("/forecast", async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.send("Location not found.");
  }

  try {
    const result = await axios.get(API_URL, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: apiKey,
        units: "metric",
        cnt: 40, // Get 40 entries (5 days × 8 per day)
      },
    });

    // Get current weather (first entry)
    const currentWeather = result.data.list[0];
    const currentDate = new Date(currentWeather.dt * 1000);
    
    const current = {
      city: result.data.city.name,
      date: currentDate.toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: currentDate.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      }),
      temp: Math.round(currentWeather.main.temp),
      weather: currentWeather.weather[0].description,
      humidity: currentWeather.main.humidity,
      windSpeed: currentWeather.wind.speed
    };

    // Group data by date and process daily forecasts
    const dailyForecasts = [];
    const groupedByDate = {};

    result.data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short'
      });
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(item);
    });

    // Process each day
    let dayCounter = 1;
    Object.keys(groupedByDate).slice(0, 5).forEach(dateKey => {
      const dayData = groupedByDate[dateKey];
      
      // Find min/max temperatures for the day
      const temps = dayData.map(item => item.main.temp);
      const minTemp = Math.round(Math.min(...temps));
      const maxTemp = Math.round(Math.max(...temps));
      
      // Get most common weather condition for the day
      const weatherConditions = dayData.map(item => item.weather[0]);
      const mostCommonWeather = weatherConditions.reduce((acc, weather) => {
        acc[weather.main] = (acc[weather.main] || 0) + 1;
        return acc;
      }, {});
      
      const dominantWeather = Object.keys(mostCommonWeather).reduce((a, b) => 
        mostCommonWeather[a] > mostCommonWeather[b] ? a : b
      );

      // Calculate rain probability (average of all entries for the day)
      const rainProbs = dayData.map(item => (item.pop || 0) * 100);
      const avgRainProb = Math.round(rainProbs.reduce((a, b) => a + b, 0) / rainProbs.length);

      // Get weather icon and description
      const weatherDesc = weatherConditions.find(w => w.main === dominantWeather);
      
      dailyForecasts.push({
        day: `Day ${dayCounter}`,
        date: dateKey,
        minTemp,
        maxTemp,
        weather: dominantWeather,
        description: weatherDesc.description,
        rainChance: avgRainProb,
        icon: getWeatherIcon(dominantWeather)
      });
      
      dayCounter++;
    });

    res.render("index.ejs", { 
      current,
      forecast: dailyForecasts
    });
    
  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).send(error.message);
  }
});

//new route for city search

// Add this new route for city search
app.post("/forecast-city", async (req, res) => {
  const { cityName } = req.body;

  if (!cityName) {
    return res.render("index.ejs", { error: "Please enter a city name." });
  }

  try {
    // First, get coordinates from city name using geocoding API
    const geocodeURL = `http://api.openweathermap.org/geo/1.0/direct`;
    const geocodeResult = await axios.get(geocodeURL, {
      params: {
        q: cityName,
        limit: 1,
        appid: apiKey,
      },
    });

    if (geocodeResult.data.length === 0) {
      return res.render("index.ejs", { error: "City not found. Please check the spelling." });
    }

    const { lat, lon } = geocodeResult.data[0];

    // Now get weather forecast using coordinates
    const result = await axios.get(API_URL, {
      params: {
        lat: lat,
        lon: lon,
        appid: apiKey,
        units: "metric",
        cnt: 40,
      },
    });

    // Process the data (same as before)
    const currentWeather = result.data.list[0];
    const currentDate = new Date(currentWeather.dt * 1000);
    
    const current = {
      city: result.data.city.name,
      date: currentDate.toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: currentDate.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      }),
      temp: Math.round(currentWeather.main.temp),
      weather: currentWeather.weather[0].description,
      humidity: currentWeather.main.humidity,
      windSpeed: currentWeather.wind.speed
    };

    // Process daily forecasts (same logic as before)
    const dailyForecasts = [];
    const groupedByDate = {};

    result.data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short'
      });
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(item);
    });

    let dayCounter = 1;
    Object.keys(groupedByDate).slice(0, 5).forEach(dateKey => {
      const dayData = groupedByDate[dateKey];
      
      const temps = dayData.map(item => item.main.temp);
      const minTemp = Math.round(Math.min(...temps));
      const maxTemp = Math.round(Math.max(...temps));
      
      const weatherConditions = dayData.map(item => item.weather[0]);
      const mostCommonWeather = weatherConditions.reduce((acc, weather) => {
        acc[weather.main] = (acc[weather.main] || 0) + 1;
        return acc;
      }, {});
      
      const dominantWeather = Object.keys(mostCommonWeather).reduce((a, b) => 
        mostCommonWeather[a] > mostCommonWeather[b] ? a : b
      );

      const rainProbs = dayData.map(item => (item.pop || 0) * 100);
      const avgRainProb = Math.round(rainProbs.reduce((a, b) => a + b, 0) / rainProbs.length);

      const weatherDesc = weatherConditions.find(w => w.main === dominantWeather);
      
      dailyForecasts.push({
        day: `Day ${dayCounter}`,
        date: dateKey,
        minTemp,
        maxTemp,
        weather: dominantWeather,
        description: weatherDesc.description,
        rainChance: avgRainProb,
        icon: getWeatherIcon(dominantWeather)
      });
      
      dayCounter++;
    });

    res.render("index.ejs", { 
      current,
      forecast: dailyForecasts
    });
    
  } catch (error) {
    console.error("API Error:", error.message);
    res.render("index.ejs", { error: "Failed to fetch weather data. Please try again." });
  }
});


// Helper function to get weather icons
// Add these helper functions before your routes
function getWeatherIcon(weather) {
  const icons = {
    'clear': '☀️',
    'sunny': '☀️',
    'clouds': '☁️',
    'cloudy': '☁️',
    'overcast clouds': '☁️',
    'scattered clouds': '⛅',
    'broken clouds': '☁️',
    'few clouds': '🌤️',
    'rain': '🌧️',
    'light rain': '🌦️',
    'heavy rain': '⛈️',
    'drizzle': '🌦️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'mist': '🌫️',
    'fog': '🌫️',
    'haze': '🌫️'
  };
  
  const weatherLower = weather.toLowerCase();
  for (let key in icons) {
    if (weatherLower.includes(key)) {
      return icons[key];
    }
  }
  return '🌤️';
}

// Make helper functions available in EJS templates
app.locals.getWeatherIcon = getWeatherIcon;
app.locals.getDayName = function(day, index) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay() - 1; // Adjust for Monday start
  return days[(today + index + 1) % 7];
};
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
