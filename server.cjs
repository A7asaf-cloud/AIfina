var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "20mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/forex", async (req, res) => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      if (response.ok) {
        const data = await response.json();
        const ils = data.rates?.ILS || 3.72;
        const eur = data.rates?.EUR || 0.92;
        const eurIls = ils / eur;
        return res.json({
          success: true,
          rates: {
            USD_ILS: parseFloat(ils.toFixed(4)),
            EUR_ILS: parseFloat(eurIls.toFixed(4)),
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
      }
    } catch (e) {
      console.error("Forex fetch error:", e);
    }
    return res.json({
      success: true,
      rates: {
        USD_ILS: 3.72,
        EUR_ILS: 4.02,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  });
  app.post("/api/test-ai", async (req, res) => {
    try {
      const apiKey = req.headers["x-gemini-api-key"] || req.body.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: "\u05DE\u05E4\u05EA\u05D7 GEMINI_API_KEY \u05D7\u05E1\u05E8. \u05D0\u05E0\u05D0 \u05D4\u05D6\u05DF \u05DE\u05E4\u05EA\u05D7 \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA."
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: '\u05EA\u05D2\u05D9\u05D1 \u05D1\u05DE\u05D9\u05DC\u05D4 \u05D0\u05D7\u05EA \u05D1\u05DC\u05D1\u05D3: "OK"'
      });
      if (response.text) {
        return res.json({
          success: true,
          message: "\u05DE\u05E4\u05EA\u05D7 \u05D4-Gemini API \u05EA\u05E7\u05D9\u05DF \u05D5\u05E4\u05E2\u05D9\u05DC \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4! \u{1F916}\u2728"
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "\u05EA\u05D2\u05D5\u05D1\u05D4 \u05E8\u05D5\u05E7\u05D4 \u05DE\u05E9\u05E8\u05EA AI."
        });
      }
    } catch (e) {
      console.error("Test AI Key Error:", e);
      return res.status(400).json({
        success: false,
        error: `\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D0\u05D9\u05DE\u05D5\u05EA \u05DE\u05E4\u05EA\u05D7: ${e.message || "\u05D4\u05DE\u05E4\u05EA\u05D7 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D0\u05D5 \u05D7\u05E1\u05D5\u05DD"}`
      });
    }
  });
  app.get("/api/stock-quote/:symbol", async (req, res) => {
    let rawParam = req.params.symbol || "AAPL";
    try {
      rawParam = decodeURIComponent(rawParam);
    } catch (e) {
    }
    let symbol = rawParam.replace(/^\$/, "").trim();
    console.log("=== Stock Quote Request ===", { rawParam: req.params.symbol, decoded: symbol });
    if (!symbol) {
      return res.json({ success: false, error: "\u05E1\u05D9\u05DE\u05D5\u05DC \u05E8\u05D9\u05E7" });
    }
    const HEBREW_MAP = {
      "\u05D8\u05E1\u05DC\u05D4": "TSLA",
      "\u05D0\u05E0\u05D1\u05D9\u05D3\u05D9\u05D4": "NVDA",
      "\u05D0\u05E4\u05DC": "AAPL",
      "\u05D0\u05DE\u05D6\u05D5\u05DF": "AMZN",
      "\u05DE\u05D9\u05E7\u05E8\u05D5\u05E1\u05D5\u05E4\u05D8": "MSFT",
      "\u05D2\u05D5\u05D2\u05DC": "GOOGL",
      "\u05DE\u05D8\u05D4": "META",
      "\u05E4\u05D9\u05D9\u05E1\u05D1\u05D5\u05E7": "META",
      "\u05D8\u05D1\u05E2": "TEVA",
      "\u05D0\u05DC\u05D1\u05D9\u05D8": "ESLT",
      "\u05D0\u05D9\u05E0\u05D8\u05DC": "INTC",
      "\u05D3\u05D9\u05E1\u05E0\u05D9": "DIS",
      "\u05E0\u05D8\u05E4\u05DC\u05D9\u05E7\u05E1": "NFLX",
      "\u05E0\u05D9\u05D9\u05E7\u05D9": "NKE",
      "\u05E4\u05D9\u05D9\u05E4\u05D0\u05DC": "PYPL",
      "\u05D1\u05D5\u05D0\u05D9\u05E0\u05D2": "BA",
      "\u05D1\u05D9\u05D8\u05E7\u05D5\u05D9\u05DF": "BTC-USD",
      "\u05D0\u05EA\u05E8\u05D9\u05D5\u05DD": "ETH-USD",
      "\u05DC\u05D0\u05D5\u05DE\u05D9": "LUMI.TA",
      "\u05E4\u05D5\u05E2\u05DC\u05D9\u05DD": "POLI.TA",
      "\u05E9\u05D5\u05E4\u05E8\u05E1\u05DC": "SAE.TA",
      "\u05D0\u05DC \u05E2\u05DC": "ELAL.TA",
      "\u05D0\u05DC\u05E2\u05DC": "ELAL.TA",
      "\u05E0\u05D9\u05D9\u05E1": "NICE",
      "\u05D8\u05D0\u05D5\u05D0\u05E8": "TSEM",
      "\u05E1\u05E4\u05D9\u05D9": "SPY",
      "\u05D0\u05E1 \u05D0\u05E0\u05D3 \u05E4\u05D9": "SPY",
      "TA35": "TA35.TA",
      "BTC": "BTC-USD",
      "ETH": "ETH-USD"
    };
    const mappedSymbol = HEBREW_MAP[symbol] || HEBREW_MAP[symbol.toLowerCase()] || symbol.toUpperCase();
    console.log("Lookup result:", { symbol, mappedSymbol, mapMatch: HEBREW_MAP[symbol] });
    async function fetchChartData(ticker) {
      const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
      for (const host of hosts) {
        try {
          const url = `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept": "application/json"
            }
          });
          if (response.ok) {
            const data = await response.json();
            const result = data.chart?.result?.[0];
            if (result) {
              const meta = result.meta;
              let currentPrice = meta.regularMarketPrice || meta.chartPreviousClose || 0;
              let prevClose = meta.chartPreviousClose || currentPrice;
              let currency = meta.currency || "USD";
              if (currency === "ILA") {
                currentPrice = currentPrice / 100;
                prevClose = prevClose / 100;
                currency = "ILS";
              }
              const changePercent = prevClose ? (currentPrice - prevClose) / prevClose * 100 : 0;
              const companyName = meta.shortName || meta.longName || ticker;
              if (currentPrice > 0) {
                return {
                  success: true,
                  symbol: meta.symbol || ticker,
                  price: parseFloat(currentPrice.toFixed(2)),
                  prevClose: parseFloat(prevClose.toFixed(2)),
                  changePercent: parseFloat(changePercent.toFixed(2)),
                  currency,
                  companyName,
                  lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
                };
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching chart for ${ticker} on ${host}:`, e);
        }
      }
      return null;
    }
    let quote = await fetchChartData(mappedSymbol);
    if (quote) {
      return res.json(quote);
    }
    try {
      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=1`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const foundSymbol = searchData.quotes?.[0]?.symbol;
        if (foundSymbol) {
          quote = await fetchChartData(foundSymbol);
          if (quote) {
            return res.json(quote);
          }
        }
      }
    } catch (e) {
      console.error(`Yahoo Search error for ${symbol}:`, e);
    }
    return res.json({
      success: false,
      symbol,
      error: `\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D1\u05D9\u05D0 \u05DE\u05D7\u05D9\u05E8 \u05E9\u05D5\u05E7 \u05D1\u05DC\u05D9\u05D9\u05D1 \u05E2\u05D1\u05D5\u05E8 ${symbol}`
    });
  });
  app.post("/api/ocr", async (req, res) => {
    try {
      const apiKey = req.headers["x-gemini-api-key"] || req.body.geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "\u05DE\u05E4\u05EA\u05D7 GEMINI_API_KEY \u05D7\u05E1\u05E8. \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05D2\u05D3\u05D9\u05E8 \u05D0\u05D5\u05EA\u05D5 \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D0\u05D5 \u05D1\u05DE\u05E9\u05EA\u05E0\u05D9 \u05D4\u05E9\u05E8\u05EA."
        });
      }
      const { imageBase64, mimeType, docType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64 data" });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      let promptText = `\u05D0\u05EA\u05D4 \u05D0\u05DC\u05D2\u05D5\u05E8\u05D9\u05EA\u05DD \u05D7\u05DB\u05DD \u05DC\u05D6\u05D9\u05D4\u05D5\u05D9 \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05E4\u05D9\u05E0\u05E0\u05E1\u05D9\u05D5\u05EA \u05D5\u05E7\u05D1\u05DC\u05D4. \u05D7\u05DC\u05E5 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05DE\u05D4\u05EA\u05DE\u05D5\u05E0\u05D4.
\u05D4\u05D7\u05D6\u05E8 \u05D0\u05DA \u05D5\u05E8\u05E7 \u05DE\u05E2\u05E8\u05DA JSON \u05EA\u05E7\u05D9\u05DF \u05D1\u05DE\u05D1\u05E0\u05D4 \u05D4\u05D1\u05D0 \u05DC\u05DC\u05D0 \u05D8\u05E7\u05E1\u05D8 \u05E0\u05D5\u05E1\u05E3 \u05D5\u05DC\u05DC\u05D0 markdown:
[{"date":"YYYY-MM-DD","description":"\u05E9\u05DD \u05D1\u05D9\u05EA \u05D4\u05E2\u05E1\u05E7","amount":number}]
\u05D7\u05D5\u05E7\u05D9\u05DD:
- \u05E1\u05DB\u05D5\u05DD \u05E9\u05DC\u05D9\u05DC\u05D9 = \u05D4\u05D5\u05E6\u05D0\u05D4 / \u05D7\u05D9\u05D5\u05D1.
- \u05E1\u05DB\u05D5\u05DD \u05D7\u05D9\u05D5\u05D1\u05D9 = \u05D4\u05DB\u05E0\u05E1\u05D4 / \u05D6\u05D9\u05DB\u05D5\u05D9.
- \u05D0\u05DD \u05D0\u05D9\u05DF \u05E9\u05E0\u05D4, \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05E9\u05E0\u05D4 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9\u05EA (${(/* @__PURE__ */ new Date()).getFullYear()}).
- \u05D7\u05DC\u05E5 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E9\u05D5\u05E8\u05D5\u05EA \u05E9\u05D2\u05DC\u05D5\u05D9\u05D5\u05EA \u05D1\u05EA\u05DE\u05D5\u05E0\u05D4.`;
      if (docType === "stocks") {
        promptText = `\u05D7\u05DC\u05E5 \u05D0\u05EA \u05DB\u05DC \u05E0\u05D9\u05D9\u05E8\u05D5\u05EA \u05D4\u05E2\u05E8\u05DA (\u05DE\u05E0\u05D9\u05D5\u05EA/\u05EA\u05E2\u05D5\u05D3\u05D5\u05EA \u05E1\u05DC) \u05DE\u05EA\u05DE\u05D5\u05E0\u05EA \u05EA\u05D9\u05E7 \u05D4\u05D4\u05E9\u05E7\u05E2\u05D5\u05EA.
\u05D4\u05D7\u05D6\u05E8 \u05D0\u05DA \u05D5\u05E8\u05E7 \u05DE\u05E2\u05E8\u05DA JSON \u05D1\u05DE\u05D1\u05E0\u05D4 \u05D4\u05D1\u05D0:
[{"symbol":"TICKER","name":"\u05E9\u05DD \u05D4\u05D7\u05D1\u05E8\u05D4","shares":number,"avgCost":number,"currentPrice":number}]
- symbol: \u05D4\u05E1\u05D9\u05DE\u05D5\u05DC \u05D4\u05D1\u05D9\u05E0\u05DC\u05D0\u05D5\u05DE\u05D9 (\u05DB\u05D2\u05D5\u05DF NVDA, AAPL, TEVA.TA)
- avgCost: \u05DE\u05D7\u05D9\u05E8 \u05E8\u05DB\u05D9\u05E9\u05D4 \u05DE\u05DE\u05D5\u05E6\u05E2 \u05DC\u05DE\u05E0\u05D9\u05D4 \u05D1\u05D3\u05D5\u05DC\u05E8\u05D9\u05DD
- currentPrice: \u05DE\u05D7\u05D9\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D9 \u05DC\u05DE\u05E0\u05D9\u05D4`;
      } else if (docType === "keren" || docType === "pension") {
        promptText = `\u05D7\u05DC\u05E5 \u05D0\u05EA \u05D4\u05E9\u05D5\u05D5\u05D9 \u05D4\u05DB\u05D5\u05DC\u05DC (\u05D1\u05E9\u05E7\u05DC\u05D9\u05DD) \u05D5\u05D4\u05EA\u05E9\u05D5\u05D0\u05D4 \u05D4\u05DE\u05EA\u05D5\u05D0\u05E8\u05EA \u05D1\u05D3\u05D5\u05D7/\u05E6\u05D9\u05DC\u05D5\u05DD \u05D4\u05DE\u05E1\u05DA.
\u05D4\u05D7\u05D6\u05E8 \u05D0\u05DA \u05D5\u05E8\u05E7 JSON \u05EA\u05E7\u05D9\u05DF:
{"value":number, "ytd":number}`;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
                  mimeType: mimeType || "image/jpeg"
                }
              }
            ]
          }
        ]
      });
      const responseText = response.text || "";
      let cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const firstBracket = cleanedText.indexOf("[");
      const lastBracket = cleanedText.lastIndexOf("]");
      const firstBrace = cleanedText.indexOf("{");
      const lastBrace = cleanedText.lastIndexOf("}");
      let jsonResult = null;
      try {
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonResult = JSON.parse(cleanedText.substring(firstBracket, lastBracket + 1));
        } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonResult = JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
        } else {
          jsonResult = JSON.parse(cleanedText);
        }
        return res.json({ success: true, result: jsonResult });
      } catch (e) {
        return res.json({ success: true, rawText: responseText, result: null });
      }
    } catch (error) {
      console.error("OCR Error:", error);
      return res.status(500).json({ error: error.message || "Error processing OCR" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
