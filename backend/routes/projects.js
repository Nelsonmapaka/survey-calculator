const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, (SELECT COUNT(*) FROM points WHERE project_id = p.id AND deleted_at IS NULL) as point_count
       FROM projects p WHERE p.user_id = $1 AND p.deleted_at IS NULL ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/trash', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, (SELECT COUNT(*) FROM points WHERE project_id = p.id AND deleted_at IS NULL) as point_count
       FROM projects p WHERE p.user_id = $1 AND p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get trash error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, coordinate_system, lo_or_zone } = req.body;
    if (!name || !coordinate_system) {
      return res.status(400).json({ error: 'Name and coordinate system are required' });
    }
    if (coordinate_system.length < 3) {
      return res.status(400).json({ error: 'Invalid coordinate system' });
    }
    const result = await pool.query(
      `INSERT INTO projects (user_id, name, coordinate_system, lo_or_zone)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name, coordinate_system, lo_or_zone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project moved to trash' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/restore', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE projects SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found in trash' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Restore project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/permanent', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project permanently deleted' });
  } catch (err) {
    console.error('Permanent delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/points', authenticateToken, async (req, res) => {
  try {
    const project = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const result = await pool.query(
      'SELECT * FROM points WHERE project_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get points error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/points', authenticateToken, async (req, res) => {
  try {
    const { name, x, y } = req.body;
    if (!name || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Name, x, and y are required' });
    }
    const project = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const result = await pool.query(
      'INSERT INTO points (project_id, name, x, y) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, name, x, y]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add point error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/points/bulk', authenticateToken, async (req, res) => {
  try {
    const { points: pts } = req.body;
    if (!pts || !Array.isArray(pts) || pts.length === 0) {
      return res.status(400).json({ error: 'Points array is required' });
    }
    const project = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const values = [];
    const params = [];
    let idx = 1;
    for (const pt of pts) {
      if (!pt.name || pt.x === undefined || pt.y === undefined) continue;
      params.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3})`);
      values.push(req.params.id, pt.name, pt.x, pt.y);
      idx += 4;
    }
    if (values.length === 0) {
      return res.status(400).json({ error: 'No valid points to import' });
    }
    const result = await pool.query(
      `INSERT INTO points (project_id, name, x, y) VALUES ${params.join(', ')} RETURNING *`,
      values
    );
    res.status(201).json({ imported: result.rows.length, points: result.rows });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/points/:pointId', authenticateToken, async (req, res) => {
  try {
    const project = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const result = await pool.query(
      'DELETE FROM points WHERE id = $1 AND project_id = $2 RETURNING id',
      [req.params.pointId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Point not found' });
    }
    res.json({ message: 'Point deleted' });
  } catch (err) {
    console.error('Delete point error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
