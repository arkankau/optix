/**
 * Summary and Rx generation routes
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { rxQueries, sessionQueries } from "../db";

const router = Router();
const resultsDir = path.resolve(__dirname, "../../../../results");
const resultsFile = path.join(resultsDir, "latest-prescription.json");

function writeLatestPrescription(payload: any) {
  try {
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    fs.writeFileSync(resultsFile, JSON.stringify(payload, null, 2));
    console.log(`📝 Prescription written to ${resultsFile}`);
  } catch (error) {
    console.error("❌ Failed to write prescription file:", error);
  }
}

/**
 * POST /api/summary
 * Generate and save final Rx
 */
router.post("/", (req, res) => {
  try {
    const { sessionId, results } = req.body;

    if (!sessionId || !results) {
      return res.status(400).json({ error: "Missing sessionId or results" });
    }

    const { OD, OS } = results;

    // Save Rx for both eyes
    if (OD) {
      rxQueries.upsert.run(
        sessionId,
        "OD",
        OD.S || 0,
        OD.C || 0,
        OD.Axis || 0,
        OD.VA_logMAR || null,
        OD.confidence || null
      );
    }

    if (OS) {
      rxQueries.upsert.run(
        sessionId,
        "OS",
        OS.S || 0,
        OS.C || 0,
        OS.Axis || 0,
        OS.VA_logMAR || null,
        OS.confidence || null
      );
    }

    // Update session state to completed
    sessionQueries.updateState.run("completed", sessionId);

    console.log(`📊 Generated Rx for session ${sessionId}`);
    console.log(`   OD: ${OD.S} ${OD.C} × ${OD.Axis}°`);
    console.log(`   OS: ${OS.S} ${OS.C} × ${OS.Axis}°`);

    writeLatestPrescription({
      sessionId,
      timestamp: Date.now(),
      rx: { OD, OS },
    });

    res.json({
      success: true,
      rx: { OD, OS },
    });
  } catch (error: any) {
    console.error("Summary generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/summary/:sessionId
 * Retrieve saved Rx for a session
 */
router.get("/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;

    const rxData = rxQueries.getBySession.all(sessionId);

    if (rxData.length === 0) {
      return res.status(404).json({ error: "No Rx found for this session" });
    }

    const rx: any = {};
    for (const row of rxData) {
      const r = row as any;
      rx[r.eye] = {
        S: r.S,
        C: r.C,
        Axis: r.Axis,
        VA_logMAR: r.VA_logMAR,
        confidence: r.confidence,
        eye: r.eye,
      };
    }

    res.json({
      sessionId,
      rx,
    });
  } catch (error: any) {
    console.error("Summary retrieval error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/summary/:sessionId/export
 * Export session data as CSV
 */
router.get("/:sessionId/export", (req, res) => {
  try {
    const { sessionId } = req.params;

    const rxData = rxQueries.getBySession.all(sessionId);

    if (rxData.length === 0) {
      return res.status(404).json({ error: "No data to export" });
    }

    // Generate CSV
    let csv = "Eye,Sphere,Cylinder,Axis,VA_logMAR,Confidence\n";
    for (const row of rxData) {
      const r = row as any;
      csv += `${r.eye},${r.S},${r.C},${r.Axis},${r.VA_logMAR || ""},${r.confidence || ""}\n`;
    }

    res.set("Content-Type", "text/csv");
    res.set("Content-Disposition", `attachment; filename="OptiX-${sessionId}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error("Export error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/latest", (req, res) => {
  try {
    const latestSession = sessionQueries.getLatest.get();
    if (!latestSession) {
      return res.status(404).json({ error: "No sessions found" });
    }

    const rows = rxQueries.getBySession.all(latestSession.id);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No Rx stored yet" });
    }

    const rx: Record<string, any> = {};
    for (const row of rows) {
      const r = row as any;
      rx[r.eye] = {
        S: r.S,
        C: r.C,
        Axis: r.Axis,
        VA_logMAR: r.VA_logMAR,
        confidence: r.confidence,
        eye: r.eye,
      };
    }

    res.json({
      sessionId: latestSession.id,
      createdAt: latestSession.createdAt,
      rx,
    });
  } catch (error: any) {
    console.error("Latest summary retrieval error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

