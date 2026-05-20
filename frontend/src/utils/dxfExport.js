function e(s) { return s.replace(/[<>/\\"'&]/g, '') }

function group(code, value) {
  return `${code}\n${value}\n`
}

function textSection() {
  let out = group(0, 'SECTION')
  out += group(2, 'HEADER')
  out += group(9, '$INSBASE')
  out += group(10, '0.0')
  out += group(20, '0.0')
  out += group(30, '0.0')
  out += group(9, '$EXTMIN')
  out += group(10, '-1e20')
  out += group(20, '-1e20')
  out += group(30, '-1e20')
  out += group(9, '$EXTMAX')
  out += group(10, '1e20')
  out += group(20, '1e20')
  out += group(30, '1e20')
  out += group(0, 'ENDSEC')
  return out
}

function tablesSection() {
  let out = group(0, 'SECTION')
  out += group(2, 'TABLES')
  out += group(0, 'TABLE')
  out += group(2, 'LTYPE')
  out += group(70, '1')
  out += group(0, 'LTYPE')
  out += group(2, 'CONTINUOUS')
  out += group(70, '0')
  out += group(3, 'Solid line')
  out += group(72, '65')
  out += group(73, '0')
  out += group(40, '0.0')
  out += group(0, 'ENDTAB')
  out += group(0, 'TABLE')
  out += group(2, 'LAYER')
  out += group(70, '4')
  for (const [name, color, ltype] of [['POINTS', '1', 'CONTINUOUS'], ['BOUNDARY', '5', 'CONTINUOUS'], ['TEXT', '7', 'CONTINUOUS'], ['DIMENSION', '3', 'CONTINUOUS']]) {
    out += group(0, 'LAYER')
    out += group(2, name)
    out += group(70, '0')
    out += group(62, color)
    out += group(6, ltype)
  }
  out += group(0, 'ENDTAB')
  out += group(0, 'TABLE')
  out += group(2, 'STYLE')
  out += group(70, '1')
  out += group(0, 'STYLE')
  out += group(2, 'STANDARD')
  out += group(70, '0')
  out += group(40, '0.0')
  out += group(41, '1.0')
  out += group(50, '0.0')
  out += group(71, '0')
  out += group(42, '1.0')
  out += group(3, 'txt')
  out += group(4, '')
  out += group(0, 'ENDTAB')
  out += group(0, 'ENDSEC')
  return out
}

function entitiesSection(points, segments) {
  let out = group(0, 'SECTION')
  out += group(2, 'ENTITIES')

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    out += group(0, 'POINT')
    out += group(8, 'POINTS')
    out += group(10, String(-p.y))
    out += group(20, String(p.x))
    out += group(30, '0.0')
    out += group(0, 'TEXT')
    out += group(8, 'TEXT')
    out += group(10, String(-p.y))
    out += group(20, String(p.x + 2))
    out += group(30, '0.0')
    out += group(40, '1.5')
    out += group(1, e(p.name))
    out += group(50, '0.0')
    out += group(7, 'STANDARD')
    out += group(72, '0')
    out += group(11, '0.0')
    out += group(21, '0.0')
    out += group(31, '0.0')
  }

  if (segments.length > 0) {
    out += group(0, 'POLYLINE')
    out += group(8, 'BOUNDARY')
    out += group(66, '1')
    out += group(70, segments.length >= 3 ? '9' : '8')
    for (const seg of segments) {
      out += group(0, 'VERTEX')
      out += group(8, 'BOUNDARY')
      out += group(10, String(-seg.from.y))
      out += group(20, String(seg.from.x))
      out += group(30, '0.0')
    }
    out += group(0, 'VERTEX')
    out += group(8, 'BOUNDARY')
    out += group(10, String(-segments[0].from.y))
    out += group(20, String(segments[0].from.x))
    out += group(30, '0.0')
    out += group(0, 'SEQEND')
  }

  for (const seg of segments) {
    const mx = (-seg.from.y + -seg.to.y) / 2
    const my = (seg.from.x + seg.to.x) / 2
    const ang = Math.atan2(seg.to.x - seg.from.x, -seg.to.y + seg.from.y) * 180 / Math.PI
    out += group(0, 'TEXT')
    out += group(8, 'DIMENSION')
    out += group(10, String(mx))
    out += group(20, String(my + 3))
    out += group(30, '0.0')
    out += group(40, '1.2')
    out += group(1, `${seg.distance}m`)
    out += group(50, '0.0')
    out += group(7, 'STANDARD')
    out += group(72, '1')
    out += group(11, String(mx))
    out += group(21, String(my + 3))
    out += group(31, '0.0')
    out += group(0, 'TEXT')
    out += group(8, 'DIMENSION')
    out += group(10, String(mx))
    out += group(20, String(my - 3))
    out += group(30, '0.0')
    out += group(40, '1.0')
    out += group(1, seg.bearingDMS)
    out += group(50, String(ang))
    out += group(7, 'STANDARD')
    out += group(72, '1')
    out += group(11, String(mx))
    out += group(21, String(my - 3))
    out += group(31, '0.0')
  }

  out += group(0, 'ENDSEC')
  return out
}

export function generateDXF(points, segments, projectName = 'survey') {
  const header = group(0, 'SECTION')
    + group(2, 'HEADER')
    + group(9, '$ACADVER')
    + group(1, 'AC1009')
    + group(0, 'ENDSEC')
  let dxf = header
  dxf += textSection()
  dxf += tablesSection()
  dxf += entitiesSection(points, segments)
  dxf += group(0, 'EOF')
  return dxf
}

export function downloadDXF(points, segments, filename = 'survey') {
  const dxf = generateDXF(points, segments, filename)
  const blob = new Blob([dxf], { type: 'application/dxf' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filename}.dxf`
  a.click()
  URL.revokeObjectURL(a.href)
}
