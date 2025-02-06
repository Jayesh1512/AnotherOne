import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const cookiesFilePath = "./instagram_cookies.json";

app.use(cors());
app.use(express.json());

const scrapeInstagram = async (profileUrl) => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  try {
    // Load saved cookies (skip login)
    if (fs.existsSync(cookiesFilePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, "utf8"));
      await context.addCookies(cookies);
      console.log("✅ Cookies loaded, skipping login.");
    } else {
      throw new Error("No saved cookies found. Please log in first to generate cookies.");
    }

    const page = await context.newPage();
    
    // Navigate directly to profile URL
    console.log(`🌍 Redirecting to profile: ${profileUrl}`);
    await page.goto(profileUrl);

    // Wait for 5 seconds before proceeding
    await page.waitForTimeout(5000);

    // Ensure the profile page is fully loaded
    await page.waitForSelector("body");

    // Extract follower/following counts
    const followers = await page.textContent("a[href$='/followers/'] > span") || "Not Found";
    const following = await page.textContent("a[href$='/following/'] > span") || "Not Found";

    await browser.close();
    return { followers: followers.trim(), following: following.trim() };
  } catch (error) {
    await browser.close();
    throw new Error("Scraping failed: " + error.message);
  }
};

app.get('/scrape', (req, res) => {
  res.json({ message: "Instagram Scraper is running!" });
});

app.post("/scrape", async (req, res) => {
  const { profile } = req.body;
  if (!profile) {
    return res.status(400).json({ error: "Profile URL is required" });
  }

  try {
    const data = await scrapeInstagram(profile);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
