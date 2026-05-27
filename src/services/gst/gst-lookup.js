/**
 * Connects to professional Indian GST API Providers (Sandbox, Appyflow, GSTINCheck)
 * This is a strict LIVE API implementation. No mock or fallback databases are used.
 */

function getSavedGSTSettings() {
  try {
    const raw = localStorage.getItem("base44_shop_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
    }
  } catch (e) {
    console.error("[GST API] Failed to read shop settings cache", e);
  }
  return {};
}

export const GST_STATE_MAP = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory"
};

export async function fetchGSTDetailsFromPortal(gstin) {
  if (!gstin || gstin.length !== 15) {
    throw new Error("GSTIN must be exactly 15 characters long.");
  }

  const cleanGSTIN = gstin.toUpperCase().trim();
  const settings = getSavedGSTSettings();
  let provider = settings.gst_api_provider || "appyflow";
  if (provider === "demo") provider = "appyflow"; // Fallback for legacy settings

  const apiKey = settings.gst_api_key || "";
  const apiSecret = settings.gst_api_secret || "";

  if (!apiKey) {
    throw new Error(`Live API Key is missing! Please go to Settings -> GST API Integration to add your ${provider.toUpperCase()} API key.`);
  }

  console.log(`[GST API] Initiating live lookup using provider: ${provider} for GSTIN: ${cleanGSTIN}`);

  try {
    if (provider === "appyflow") {
      return await callAppyflowAPI(cleanGSTIN, apiKey);
    } else if (provider === "gstincheck") {
      return await callGSTINCheckAPI(cleanGSTIN, apiKey);
    } else if (provider === "sandbox") {
      return await callSandboxAPI(cleanGSTIN, apiKey, apiSecret);
    }
  } catch (apiError) {
    console.error(`[GST API] Provider ${provider} call failed:`, apiError);
    throw new Error(`${provider.toUpperCase()} API Error: ` + apiError.message);
  }

  throw new Error("Invalid GST Provider configured.");
}

async function callAppyflowAPI(gstin, secretKey) {
  const url = `https://appyflow.in/api/verifyGST?gstNo=${gstin}&key_secret=${secretKey}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error status: ${response.status}`);
  }

  const json = await response.json();
  if (json.error || !json.taxpayerInfo) {
    throw new Error(json.message || "Returned an empty or error state response.");
  }

  const info = json.taxpayerInfo;
  const stateCode = gstin.substring(0, 2);
  const stateName = GST_STATE_MAP[stateCode] || info.pradr?.addr?.stcd || "Other State";

  let address = info.pradr?.adr || "";
  if (!address && info.pradr?.addr) {
    const a = info.pradr.addr;
    address = [a.flno, a.bldg, a.st, a.loc].filter(Boolean).join(", ");
  }

  return {
    businessName: info.lgnm || info.tradeNam || "N/A",
    tradeName: info.tradeNam || info.lgnm || "N/A",
    address: address || "N/A",
    city: info.pradr?.addr?.dst || info.pradr?.addr?.loc || "N/A",
    pincode: info.pradr?.addr?.pncd || "000000",
    state: stateName,
    status: info.sts || "Active"
  };
}

async function callGSTINCheckAPI(gstin, apiKey) {
  const url = `https://sheet.gstincheck.co.in/check/${apiKey}/${gstin}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error status: ${response.status}`);
  }

  const json = await response.json();
  if (json.flag === false || !json.data) {
    throw new Error(json.message || "Invalid or unsuccessful lookup.");
  }

  const info = json.data;
  const stateCode = gstin.substring(0, 2);
  const stateName = GST_STATE_MAP[stateCode] || info.stcd || "Other State";

  return {
    businessName: info.lgnm || info.tradeNam || "N/A",
    tradeName: info.tradeNam || info.lgnm || "N/A",
    address: info.pradr?.adr || "N/A",
    city: info.pradr?.addr?.dst || "N/A",
    pincode: info.pradr?.addr?.pncd || "000000",
    state: stateName,
    status: info.sts || "Active"
  };
}

async function callSandboxAPI(gstin, clientId, clientSecret) {
  const authUrl = "https://api.sandbox.co.in/authenticate";
  const authResponse = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "x-api-key": clientId,
      "x-api-secret": clientSecret,
      "x-api-version": "1.0"
    }
  });

  if (!authResponse.ok) {
    throw new Error(`Authentication failed: ${authResponse.status}`);
  }

  const authJson = await authResponse.json();
  const accessToken = authJson.access_token;
  if (!accessToken) {
    throw new Error("Authentication failed: No access_token returned.");
  }

  const queryUrl = `https://api.sandbox.co.in/gsp/public/gstin/${gstin}`;
  const response = await fetch(queryUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "x-api-key": clientId,
      "x-api-version": "1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Lookup failed: ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 200 || !json.data) {
    throw new Error(json.message || "Unsuccessful query.");
  }

  const info = json.data;
  const stateCode = gstin.substring(0, 2);
  const stateName = GST_STATE_MAP[stateCode] || info.pradr?.addr?.stcd || "Other State";

  let address = info.pradr?.adr || "";
  if (!address && info.pradr?.addr) {
    const a = info.pradr.addr;
    address = [a.flno, a.bldg, a.st, a.loc].filter(Boolean).join(", ");
  }

  return {
    businessName: info.lgnm || info.tradeNam || "N/A",
    tradeName: info.tradeNam || info.lgnm || "N/A",
    address: address || "N/A",
    city: info.pradr?.addr?.dst || info.pradr?.addr?.loc || "N/A",
    pincode: info.pradr?.addr?.pncd || "000000",
    state: stateName,
    status: info.sts || "Active"
  };
}
