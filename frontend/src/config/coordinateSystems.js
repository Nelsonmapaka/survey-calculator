export const COORDINATE_SYSTEMS = [
  {
    id: 'custom-gauss',
    name: 'Gauss Conformal (Custom)',
    group: 'Custom',
    hasZone: true,
    zoneLabel: 'Central Meridian',
    zonePlaceholder: "e.g. 30°30'E",
    proj: null,
  },
  {
    id: 'custom-utm',
    name: 'UTM (Custom)',
    group: 'Custom',
    hasZone: true,
    zoneLabel: 'Zone',
    zonePlaceholder: 'e.g. 36',
    proj: null,
  },
  {
    id: 'EPSG:32735',
    name: 'WGS84 / UTM zone 35S',
    group: 'WGS84 UTM',
    proj: '+proj=utm +zone=35 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  },
  {
    id: 'EPSG:32736',
    name: 'WGS84 / UTM zone 36S',
    group: 'WGS84 UTM',
    proj: '+proj=utm +zone=36 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  },
  {
    id: 'EPSG:32737',
    name: 'WGS84 / UTM zone 37S',
    group: 'WGS84 UTM',
    proj: '+proj=utm +zone=37 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
  },
  {
    id: 'EPSG:20935',
    name: 'Arc 1950 / UTM zone 35S',
    group: 'Arc 1950 UTM',
    proj: '+proj=utm +zone=35 +south +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:20936',
    name: 'Arc 1950 / UTM zone 36S',
    group: 'Arc 1950 UTM',
    proj: '+proj=utm +zone=36 +south +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22291',
    name: 'LO31 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=31 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22293',
    name: 'LO33 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=33 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22295',
    name: 'LO35 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=35 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22277',
    name: 'LO17 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=17 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22279',
    name: 'LO19 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=19 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22281',
    name: 'LO21 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=21 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22283',
    name: 'LO23 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=23 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22285',
    name: 'LO25 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=25 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22287',
    name: 'LO27 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=27 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
  {
    id: 'EPSG:22289',
    name: 'LO29 (Gauss conformal)',
    group: 'Gauss LO',
    proj: '+proj=tmerc +lat_0=0 +lon_0=29 +k=1 +x_0=0 +y_0=0 +ellps=clrk80 +units=m +no_defs',
  },
]

export function getProjection(id, zone) {
  const cs = COORDINATE_SYSTEMS.find(s => s.id === id)
  if (!cs) return null
  if (cs.proj) return cs.proj
  if (id === 'custom-gauss') {
    const lo = parseDMS(zone)
    if (lo === null) return null
    return `+proj=tmerc +lat_0=0 +lon_0=${lo} +k=1 +x_0=0 +y_0=0 +ellps=bessel +units=m`
  }
  if (id === 'custom-utm') {
    const z = zone.replace(/[^\d]/g, '')
    if (!z) return null
    const south = zone.toUpperCase().includes('S') ? ' +south' : ''
    return `+proj=utm +zone=${z}${south} +ellps=WGS84 +units=m`
  }
  return null
}

function parseDMS(dms) {
  if (!dms) return null
  const num = parseFloat(dms.replace(/[^\d.\-]/g, ''))
  if (isNaN(num)) return null
  const dir = dms.replace(/[^NSEW]/gi, '').toUpperCase()
  if (dms.includes('°')) return num * (dir === 'S' || dir === 'W' ? -1 : 1)
  return num
}
