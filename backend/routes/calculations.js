const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { calculateJoin, calculatePolar, calculateAreaShoelace, dmsToDecimal } = require('../utils/bearing');
const bankersRound = require('../utils/bankersRounding');

const router = express.Router();

router.post('/join', authenticateToken, (req, res) => {
  try {
    const { points } = req.body;
    if (!points || points.length < 2) {
      return res.status(400).json({ error: 'At least 2 points are required' });
    }
    const results = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const join = calculateJoin(p1.x, p1.y, p2.x, p2.y);
      results.push({
        from: p1.name,
        to: p2.name,
        ...join,
      });
    }
    res.json({ joins: results });
  } catch (err) {
    console.error('Join calculation error:', err);
    res.status(500).json({ error: 'Calculation error' });
  }
});

router.post('/join/radial', authenticateToken, (req, res) => {
  try {
    const { origin, targets } = req.body;
    if (!origin || !targets || targets.length === 0) {
      return res.status(400).json({ error: 'Origin point and at least 1 target point required' });
    }
    const results = targets.map((t) => {
      const join = calculateJoin(origin.x, origin.y, t.x, t.y);
      return { from: origin.name, to: t.name, ...join };
    });
    res.json({ joins: results });
  } catch (err) {
    console.error('Radial join error:', err);
    res.status(500).json({ error: 'Calculation error' });
  }
});

router.post('/polar', authenticateToken, (req, res) => {
  try {
    const { origin, bearingDeg, distance } = req.body;
    if (!origin || bearingDeg === undefined || distance === undefined) {
      return res.status(400).json({ error: 'Origin, bearing, and distance are required' });
    }
    const result = calculatePolar(origin.x, origin.y, bearingDeg, distance);
    res.json({ point: { name: origin.name + '_P', ...result } });
  } catch (err) {
    console.error('Polar calculation error:', err);
    res.status(500).json({ error: 'Calculation error' });
  }
});

router.post('/polar/radial', authenticateToken, (req, res) => {
  try {
    const { origin, measurements } = req.body;
    if (!origin || !measurements || measurements.length === 0) {
      return res.status(400).json({ error: 'Origin and at least 1 measurement required' });
    }
    const results = measurements.map((m, i) => {
      const bearingDeg = m.bearingDeg !== undefined
        ? m.bearingDeg
        : dmsToDecimal(m.bearingD || 0, m.bearingM || 0, m.bearingS || 0);
      const pt = calculatePolar(origin.x, origin.y, bearingDeg, m.distance);
      return { name: m.name || `${origin.name}_P${i + 1}`, ...pt, bearingDeg, distance: m.distance };
    });
    res.json({ points: results });
  } catch (err) {
    console.error('Radial polar error:', err);
    res.status(500).json({ error: 'Calculation error' });
  }
});

router.post('/polar/sequential', authenticateToken, (req, res) => {
  try {
    const { origin, segments } = req.body;
    if (!origin || !segments || segments.length === 0) {
      return res.status(400).json({ error: 'Origin and at least 1 segment required' });
    }
    const results = [];
    let currentX = origin.x;
    let currentY = origin.y;
    segments.forEach((seg, i) => {
      const bearingDeg = seg.bearingDeg !== undefined
        ? seg.bearingDeg
        : dmsToDecimal(seg.bearingD || 0, seg.bearingM || 0, seg.bearingS || 0);
      const pt = calculatePolar(currentX, currentY, bearingDeg, seg.distance);
      results.push({ name: seg.name || `PT${i + 1}`, x: pt.x, y: pt.y, bearingDeg, distance: seg.distance });
      currentX = pt.x;
      currentY = pt.y;
    });
    res.json({ points: results });
  } catch (err) {
    console.error('Sequential polar error:', err);
    res.status(500).json({ error: 'Calculation error' });
  }
});

router.post('/area', authenticateToken, (req, res) => {
  try {
    const { points } = req.body;
    if (!points || points.length < 3) {
      return res.status(400).json({ error: 'At least 3 points are required' });
    }
    const result = calculateAreaShoelace(points);
    res.json(result);
  } catch (err) {
    console.error('Area calculation error:', err);
    res.status(500).json({ error: 'Calculation error' });
  }
});

module.exports = router;
