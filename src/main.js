import './style.css'
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87CEEB)
scene.fog = new THREE.Fog(0x87CEEB, 400, 2800)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
// Slightly reduced from 3.0 so metallic paint doesn't blow out to solid white
const sun = new THREE.DirectionalLight(0xffffff, 2.4)
sun.position.set(20, 30, 20)
scene.add(sun)
scene.add(new THREE.AmbientLight(0xffffff, 0.9))

// ===== Track =====
const TRACK_WIDTH = 12

const trackControlPoints = [
    new THREE.Vector3(-240, 0, 0),
    new THREE.Vector3(-240, 0, -480),
    new THREE.Vector3(-240, 0, -960),
    new THREE.Vector3(-160, 0, -1248),
    new THREE.Vector3(80, 0, -1408),
    new THREE.Vector3(400, 0, -1408),
    new THREE.Vector3(640, 0, -1280),
    new THREE.Vector3(672, 0, -992),
    new THREE.Vector3(560, 0, -736),
    new THREE.Vector3(320, 0, -608),
    new THREE.Vector3(240, 0, -288),
    new THREE.Vector3(160, 0, 80),
    new THREE.Vector3(-80, 0, 240)
]

const trackCurve = new THREE.CatmullRomCurve3(trackControlPoints, true, 'catmullrom', 0.5)
const TRACK_SAMPLE_COUNT = 900
const rawTrackPoints = trackCurve.getPoints(TRACK_SAMPLE_COUNT)
const trackPoints = rawTrackPoints.slice(0, -1)

// ===== Checkpoints =====
const checkpoints = [
    trackPoints[0],
    trackPoints[Math.floor(trackPoints.length * 0.125)],
    trackPoints[Math.floor(trackPoints.length * 0.25)],
    trackPoints[Math.floor(trackPoints.length * 0.375)],
    trackPoints[Math.floor(trackPoints.length * 0.5)],
    trackPoints[Math.floor(trackPoints.length * 0.625)],
    trackPoints[Math.floor(trackPoints.length * 0.75)],
    trackPoints[Math.floor(trackPoints.length * 0.875)]
]
const CHECKPOINT_RADIUS = 80

// ===== Ground =====
const trackBoundsMinX = Math.min(...trackControlPoints.map(p => p.x))
const trackBoundsMaxX = Math.max(...trackControlPoints.map(p => p.x))
const trackBoundsMinZ = Math.min(...trackControlPoints.map(p => p.z))
const trackBoundsMaxZ = Math.max(...trackControlPoints.map(p => p.z))
const GROUND_MARGIN = 600

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(
        (trackBoundsMaxX - trackBoundsMinX) + GROUND_MARGIN * 2,
        (trackBoundsMaxZ - trackBoundsMinZ) + GROUND_MARGIN * 2
    ),
    new THREE.MeshStandardMaterial({ color: 0x1f3d1f })
)
ground.rotation.x = -Math.PI / 2
ground.position.set((trackBoundsMaxX + trackBoundsMinX) / 2, 0, (trackBoundsMaxZ + trackBoundsMinZ) / 2)
ground.receiveShadow = true
scene.add(ground)

// ===== Road surface =====
function buildRoadGeometry(points, width) {
    const vertices = [], indices = []
    for (let i = 0; i < points.length; i++) {
        const cur = points[i], nxt = points[(i + 1) % points.length]
        const dir = new THREE.Vector3().subVectors(nxt, cur).normalize()
        const perp = new THREE.Vector3(dir.z, 0, -dir.x)
        const L = new THREE.Vector3().copy(cur).addScaledVector(perp, width / 2)
        const R = new THREE.Vector3().copy(cur).addScaledVector(perp, -width / 2)
        vertices.push(L.x, L.y, L.z, R.x, R.y, R.z)
    }
    for (let i = 0; i < points.length; i++) {
        const n = (i + 1) % points.length
        indices.push(i*2, i*2+1, n*2, i*2+1, n*2+1, n*2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
}

const road = new THREE.Mesh(
    buildRoadGeometry(trackPoints, TRACK_WIDTH),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
)
road.position.y = 0.01
scene.add(road)

// ===== Lane markings =====
function buildOffsetLineGeometry(points, offset, width) {
    const vertices = [], indices = []
    for (let i = 0; i < points.length; i++) {
        const cur = points[i], nxt = points[(i + 1) % points.length]
        const dir = new THREE.Vector3().subVectors(nxt, cur).normalize()
        const perp = new THREE.Vector3(dir.z, 0, -dir.x)
        const ctr = new THREE.Vector3().copy(cur).addScaledVector(perp, offset)
        const L = new THREE.Vector3().copy(ctr).addScaledVector(perp, width / 2)
        const R = new THREE.Vector3().copy(ctr).addScaledVector(perp, -width / 2)
        vertices.push(L.x, L.y, L.z, R.x, R.y, R.z)
    }
    for (let i = 0; i < points.length; i++) {
        const n = (i + 1) % points.length
        indices.push(i*2, i*2+1, n*2, i*2+1, n*2+1, n*2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
}

const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
const leftEdge  = new THREE.Mesh(buildOffsetLineGeometry(trackPoints,  TRACK_WIDTH/2 - 0.15, 0.3), lineMat)
const rightEdge = new THREE.Mesh(buildOffsetLineGeometry(trackPoints, -TRACK_WIDTH/2 + 0.15, 0.3), lineMat)
leftEdge.position.y = rightEdge.position.y = 0.02
scene.add(leftEdge, rightEdge)

for (let i = 0; i < trackPoints.length; i += 16) {
    const pts = trackPoints.slice(i, Math.min(i + 8, trackPoints.length) + 1)
    if (pts.length < 2) continue
    const dash = new THREE.Mesh(buildOffsetLineGeometry(pts, 0, 0.3), lineMat)
    dash.position.y = 0.02
    scene.add(dash)
}

// ===== Barriers =====
const BARRIER_HEIGHT = 0.8
const BARRIER_THICKNESS = 0.3

function buildBarrierGeometry(points, side) {
    const vertices = [], indices = []
    const offset = side * (TRACK_WIDTH / 2 + 0.05)
    for (let i = 0; i < points.length; i++) {
        const cur = points[i], nxt = points[(i + 1) % points.length]
        const dir = new THREE.Vector3().subVectors(nxt, cur).normalize()
        const perp = new THREE.Vector3(dir.z, 0, -dir.x)
        const base = new THREE.Vector3().copy(cur).addScaledVector(perp, offset)
        const bi = base.clone(), bo = base.clone().addScaledVector(perp, side * BARRIER_THICKNESS)
        const ti = base.clone().setY(BARRIER_HEIGHT), to = bo.clone().setY(BARRIER_HEIGHT)
        vertices.push(bi.x,bi.y,bi.z, bo.x,bo.y,bo.z, ti.x,ti.y,ti.z, to.x,to.y,to.z)
    }
    for (let i = 0; i < points.length; i++) {
        const n = (i+1) % points.length, b = i*4, nb = n*4
        indices.push(b,b+2,nb, b+2,nb+2,nb)
        indices.push(b+1,nb+1,b+3, nb+1,nb+3,b+3)
        indices.push(b+2,b+3,nb+2, b+3,nb+3,nb+2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    g.setIndex(indices); g.computeVertexNormals()
    return g
}

const barrierMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 })
scene.add(new THREE.Mesh(buildBarrierGeometry(trackPoints, -1), barrierMat))
scene.add(new THREE.Mesh(buildBarrierGeometry(trackPoints,  1), barrierMat))

// ===== Finish line =====
function createCheckerTexture(cols, rows) {
    const C = 32, canvas = document.createElement('canvas')
    canvas.width = cols * C; canvas.height = rows * C
    const ctx = canvas.getContext('2d')
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#101010'
            ctx.fillRect(c*C, r*C, C, C)
        }
    return new THREE.CanvasTexture(canvas)
}

const FINISH_LINE_LENGTH = 6
const finishLine = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_WIDTH, FINISH_LINE_LENGTH),
    new THREE.MeshStandardMaterial({ map: createCheckerTexture(Math.max(4, Math.round(TRACK_WIDTH/1.5)), 2) })
)
finishLine.rotation.x = -Math.PI / 2
finishLine.position.set(trackControlPoints[0].x, 0.03, trackControlPoints[0].z)
scene.add(finishLine)

// ===== Trees (instanced) =====
const TREE_MIN_OFF = TRACK_WIDTH / 2 + BARRIER_THICKNESS + 8
const TREE_MAX_OFF = TRACK_WIDTH / 2 + BARRIER_THICKNESS + 30
const treeXforms = []
for (let i = 0; i < trackPoints.length; i += 3) {
    const cur = trackPoints[i], nxt = trackPoints[(i+1) % trackPoints.length]
    const dir = new THREE.Vector3().subVectors(nxt, cur).normalize()
    const perp = new THREE.Vector3(dir.z, 0, -dir.x)
    ;[-1, 1].forEach(side => {
        for (let j = 0; j < 2; j++) {
            const od = side * (TREE_MIN_OFF + Math.random() * (TREE_MAX_OFF - TREE_MIN_OFF))
            const p = new THREE.Vector3().copy(cur).addScaledVector(perp, od)
            p.addScaledVector(dir, (Math.random() - 0.5) * 6)
            treeXforms.push({ x: p.x, z: p.z, ry: Math.random()*Math.PI*2, s: 0.8+Math.random()*0.5 })
        }
    })
}
const trunkMesh   = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3,0.4,3,6),  new THREE.MeshStandardMaterial({color:0x6b4423}), treeXforms.length)
const foliageMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8,4,8),           new THREE.MeshStandardMaterial({color:0x2d6a2d}), treeXforms.length)
const td = new THREE.Object3D()
treeXforms.forEach((t, i) => {
    td.position.set(t.x, 1.5*t.s, t.z); td.rotation.y=t.ry; td.scale.setScalar(t.s); td.updateMatrix()
    trunkMesh.setMatrixAt(i, td.matrix)
    td.position.set(t.x, 4.5*t.s, t.z); td.updateMatrix()
    foliageMesh.setMatrixAt(i, td.matrix)
})
trunkMesh.instanceMatrix.needsUpdate = foliageMesh.instanceMatrix.needsUpdate = true
scene.add(trunkMesh, foliageMesh)

// ===== Car — Wide-body muscle car (Challenger/Camaro style) =====
//
// The shape comes from THREE places working together:
//  1. PROFILE — a spline-extruded side silhouette with two fender PEAKS
//     (points [3] and [12]) that are the visual signature of a muscle car.
//  2. FLARES  — separate box pieces at each wheel arch that protrude
//     beyond the body width, giving the "wide body" stance.
//  3. TUMBLEHOME — the cabin narrows above the beltline, so it reads
//     narrower than the lower body just like a real unibody car.
//
const CAR_WIDTH       = 2.2   // wide stance
const CAR_LENGTH      = 4.5
const CAR_BELT_HEIGHT = 0.66  // beltline / body crease height
const CAR_ROOF_HEIGHT = 1.04  // low roof = sporty look
const CAR_TUMBLEHOME  = 0.80  // cabin narrows to 80% of body width above beltline

// Side silhouette, traced rear-bottom → clockwise:
//   rocker → front bumper → front FENDER PEAK → hood (power bulge) →
//   cowl → A-pillar → roof → C-pillar → trunk → rear FENDER PEAK → rear bumper
const CAR_BODY_PROFILE = [
    [-2.22, 0.10],   //  0  rear bumper, bottom
    [ 2.16, 0.10],   //  1  front bumper, bottom (flat rocker sill)
    [ 2.28, 0.25],   //  2  front bumper face
    [ 2.18, 0.60],   //  3  front fender PEAK  ← muscle-car silhouette cue
    [ 1.86, 0.68],   //  4  hood front (drops just behind fender)
    [ 1.18, 0.72],   //  5  hood center — power bulge
    [ 0.58, 0.67],   //  6  hood rear / cowl (drops toward windshield base)
    [ 0.20, 0.84],   //  7  A-pillar base
    [-0.10, 1.04],   //  8  windshield top / roof front
    [-0.78, 1.04],   //  9  roof rear (flat)
    [-1.24, 0.86],   // 10  C-pillar / rear window base
    [-1.68, 0.60],   // 11  trunk deck (short)
    [-2.04, 0.57],   // 12  rear fender PEAK   ← muscle-car silhouette cue
    [-2.24, 0.27],   // 13  rear bumper face
]

function buildCarBodyGeometry() {
    const pts = CAR_BODY_PROFILE.map(p => new THREE.Vector2(p[0], p[1]))
    const shape = new THREE.Shape()
    shape.moveTo(pts[0].x, pts[0].y)
    shape.splineThru(pts.slice(1).concat([pts[0]]))  // smooth curve, not lineTo facets

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: CAR_WIDTH,
        curveSegments: 32,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
        steps: 1
    })

    // ExtrudeGeometry: profile in XY, extrusion along +Z.
    // After rotateY(-π/2): old Z→new X (width), old X→new -Z (length).
    // translate(CAR_WIDTH/2) centers body on X axis: [-CAR_WIDTH/2, +CAR_WIDTH/2]
    geo.rotateY(-Math.PI / 2)
    geo.translate(CAR_WIDTH / 2, 0, 0)

    // Tumblehome: pull the sides in above the beltline
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (y > CAR_BELT_HEIGHT) {
            const t = Math.min((y - CAR_BELT_HEIGHT) / (CAR_ROOF_HEIGHT - CAR_BELT_HEIGHT), 1)
            pos.setX(i, pos.getX(i) * THREE.MathUtils.lerp(1, CAR_TUMBLEHOME, t))
        }
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
}

function createCar(bodyColor) {
    const grp = new THREE.Group()

    // ── Materials ──────────────────────────────────────────────────────────
    const bodyMat = new THREE.MeshStandardMaterial({
        color: bodyColor, flatShading: true, side: THREE.DoubleSide,
        roughness: 0.28, metalness: 0.45
    })
    const blackMat = new THREE.MeshStandardMaterial({
        color: 0x111111, flatShading: true, roughness: 0.55, metalness: 0.1
    })
    const darkMat   = new THREE.MeshStandardMaterial({ color: 0x060606, roughness: 0.8 })
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })
    const glassMat  = new THREE.MeshStandardMaterial({
        color: 0x0b1420, roughness: 0.04, transparent: true, opacity: 0.90
    })
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.12, metalness: 0.95 })
    const hlMat     = new THREE.MeshStandardMaterial({
        color: 0xf8f8f0, emissive: 0xffffcc, emissiveIntensity: 0.20, roughness: 0.08
    })
    const tlMat     = new THREE.MeshStandardMaterial({
        color: 0xff1111, emissive: 0xcc0000, emissiveIntensity: 0.65
    })
    const amberMat  = new THREE.MeshStandardMaterial({
        color: 0xff9900, emissive: 0xff6600, emissiveIntensity: 0.45
    })

    // ── Body shell ─────────────────────────────────────────────────────────
    const body = new THREE.Mesh(buildCarBodyGeometry(), bodyMat)
    body.castShadow = true
    grp.add(body)

    // ── Fender flares — the defining wide-body muscle-car feature ──────────
    // Separate pieces that stick out ~0.14 beyond the main body width
    // at each wheel arch. Two-part: outer wall + top cap lip.
    const BH = CAR_WIDTH / 2   // body half-width = 1.1

    ;[
        { z:  1.38, h: 0.30, len: 1.10 },   // front arch
        { z: -1.38, h: 0.32, len: 1.05 },   // rear arch (fractionally taller)
    ].forEach(({ z, h, len }) => {
        ;[-1, 1].forEach(side => {
            // Vertical outer wall
            const wall = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, len), bodyMat)
            wall.position.set(side * (BH + 0.07), 0.42, z)
            grp.add(wall)

            // Horizontal top cap (the arch lip visible from above/behind)
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, len * 0.88), bodyMat)
            cap.position.set(side * (BH + 0.01), 0.42 + h / 2 - 0.02, z)
            grp.add(cap)
        })
    })

    // ── Side sills / rocker panels ─────────────────────────────────────────
    ;[-1, 1].forEach(side => {
        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.11, 2.35), blackMat)
        sill.position.set(side * (BH + 0.01), 0.10, 0)
        grp.add(sill)
    })

    // ── Racing stripes (hood → windshield slope → roof → trunk) ───────────
    ;[-0.28, 0.28].forEach(x => {
        // Hood (slight rise angle matches hood bulge)
        const hs = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.014, 1.38), stripeMat)
        hs.position.set(x, 0.716, 1.18)
        hs.rotation.x = -0.055
        grp.add(hs)

        // Windshield slope
        const ws = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.014, 0.60), stripeMat)
        ws.position.set(x, 0.946, 0.28)
        ws.rotation.x = -0.78
        grp.add(ws)

        // Roof (flat)
        const rs = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.014, 0.72), stripeMat)
        rs.position.set(x, 1.054, -0.42)
        grp.add(rs)

        // Trunk (slight downward angle)
        const ts = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.014, 0.58), stripeMat)
        ts.position.set(x, 0.612, -1.52)
        ts.rotation.x = 0.09
        grp.add(ts)
    })

    // ── Hood power bulge (center raised section) ───────────────────────────
    const bulge = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.062, 1.08), bodyMat)
    bulge.position.set(0, 0.756, 1.10)
    grp.add(bulge)

    // ── Windows ────────────────────────────────────────────────────────────
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 0.62), glassMat)
    ws.position.set(0, 0.946, 0.55)
    ws.rotation.x = -0.94
    grp.add(ws)

    const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.52), glassMat)
    rw.position.set(0, 0.946, -0.86)
    rw.rotation.x = 0.90
    grp.add(rw)

    ;[-1, 1].forEach(side => {
        const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.36), glassMat)
        sw.position.set(side * 0.92, 0.93, -0.06)
        sw.rotation.y = side * Math.PI / 2
        grp.add(sw)
    })

    // ── Front fascia & headlights ──────────────────────────────────────────
    const ff = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH + 0.10, 0.46, 0.18), blackMat)
    ff.position.set(0, 0.34, 2.20)
    grp.add(ff)

    // Chin splitter
    const sp = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH + 0.22, 0.06, 0.30), blackMat)
    sp.position.set(0, 0.11, 2.28)
    grp.add(sp)

    // Grille
    const grille = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.22, 0.08),
    darkMat
)

grille.position.x = 0
grille.position.y = 0.36
grille.position.z = 2.24

grp.add(grille)

    // Headlights (wide rectangular housings like Challenger)
    ;[-1, 1].forEach(side => {
        const hsg = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.12), blackMat)
        hsg.position.set(side * 0.78, 0.59, 2.19)
        grp.add(hsg)

        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.07), hlMat)
        lens.position.set(side * 0.78, 0.59, 2.22)
        grp.add(lens)

        const turn = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.09, 0.06), amberMat)
        turn.position.set(side * 0.86, 0.36, 2.22)
        grp.add(turn)
    })

    // ── Rear fascia & taillights ───────────────────────────────────────────
    const rf = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH + 0.10, 0.42, 0.18), blackMat)
    rf.position.set(0, 0.34, -2.20)
    grp.add(rf)

    // Full-width tail light bar (signature Challenger look)
    const tlBar = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH - 0.26, 0.11, 0.07), tlMat)
    tlBar.position.set(0, 0.55, -2.22)
    grp.add(tlBar)

    // ── Rear wing ──────────────────────────────────────────────────────────
    ;[-0.58, 0.58].forEach(x => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.10), blackMat)
        pillar.position.set(x, 0.80, -1.76)
        grp.add(pillar)
    })
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.08, 0.32), blackMat)
    blade.position.set(0, 0.91, -1.76)
    blade.rotation.x = -0.13
    grp.add(blade)

    // ── Mirrors ────────────────────────────────────────────────────────────
    ;[-1, 1].forEach(side => {
        const mir = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.21), bodyMat)
        mir.position.set(side * 0.94, 0.91, 0.94)
        grp.add(mir)
    })

    // ── Exhaust tips ───────────────────────────────────────────────────────
    ;[-0.62, 0.62].forEach(x => {
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.21, 10), chromeMat)
        tip.rotation.z = Math.PI / 2
        tip.position.set(x, 0.21, -2.21)
        grp.add(tip)
    })

    // ── Wheels — 5-sided rim = 5-spoke visual at game distance ─────────────
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.92 })
    const rimMat  = new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.20, metalness: 0.80, flatShading: true })
    const hubMat  = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.10, metalness: 1.00 })

    function makeWheel() {
        const wg = new THREE.Group()

        // Tire
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.32, 20), tireMat)
        tire.rotation.z = Math.PI / 2
        wg.add(tire)

        // 5-sided rim cylinder: flat shading on a pentagon gives 5 distinct
        // highlight faces that read as a 5-spoke rim at the player camera distance
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.33, 5), rimMat)
        rim.rotation.z = Math.PI / 2
        wg.add(rim)

        // Center hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.34, 8), hubMat)
        hub.rotation.z = Math.PI / 2
        wg.add(hub)

        wg.castShadow = true
        return wg
    }

    // Wheels sit just outside the main body — the fender flares arch over them
    const WT = CAR_WIDTH / 2 + 0.04   // half-track width = 1.14

    const frontLeftPivot = new THREE.Group()
    frontLeftPivot.position.set(-WT, 0.43, 1.38)
    frontLeftPivot.add(makeWheel())
    grp.add(frontLeftPivot)

    const frontRightPivot = new THREE.Group()
    frontRightPivot.position.set(WT, 0.43, 1.38)
    frontRightPivot.add(makeWheel())
    grp.add(frontRightPivot)

    const rearL = new THREE.Group()
    rearL.position.set(-WT, 0.43, -1.38)
    rearL.add(makeWheel())
    grp.add(rearL)

    const rearR = new THREE.Group()
    rearR.position.set(WT, 0.43, -1.38)
    rearR.add(makeWheel())
    grp.add(rearR)

    grp.frontLeftPivot  = frontLeftPivot
    grp.frontRightPivot = frontRightPivot
    return grp
}

const car = createCar(0xff1a1a)
car.position.set(trackControlPoints[0].x, 0, trackControlPoints[0].z +15)
car.rotation.y = Math.PI

scene.add(car)

camera.position.set(trackControlPoints[0].x, 5, trackControlPoints[0].z - 10)

// ===== Track boundary collision =====
function getNearestTrackFrame(position) {
    let nearestIndex = 0, nearestDistSq = Infinity
    for (let i = 0; i < trackPoints.length; i++) {
        const dx = position.x - trackPoints[i].x, dz = position.z - trackPoints[i].z
        const d2 = dx*dx + dz*dz
        if (d2 < nearestDistSq) { nearestDistSq = d2; nearestIndex = i }
    }
    const cur = trackPoints[nearestIndex]
    const nxt = trackPoints[(nearestIndex + 1) % trackPoints.length]
    const dir  = new THREE.Vector3().subVectors(nxt, cur).normalize()
    const perp = new THREE.Vector3(dir.z, 0, -dir.x)
    return { current: cur, direction: dir, perpendicular: perp }
}

const CAR_HALF_WIDTH    = CAR_WIDTH / 2
const MAX_LATERAL_OFFSET = TRACK_WIDTH / 2 - CAR_HALF_WIDTH
const WALL_SCRUB_FACTOR  = 0.4

// ===== Controls =====
const keys = {}
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true })
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false })

// ===== Movement state =====
let speed = 0, heading = Math.PI,velocityAngle = Math.PI,steerAngle = 0
let desiredCameraPos = new THREE.Vector3()
let reverseBlend = 0, reverseTarget = 0
const clock = new THREE.Clock()

// ===== Physics constants =====
const MAX_SPEED             = 78
const REVERSE_SPEED_RATIO   = 0.2
const ACCEL                 = 9
const ACCEL_HIGH_SPEED_FALLOFF = 0.8
const BRAKE                 = 13
const FRICTION              = 0.96
const TRACTION              = 0.06
const WHEELBASE             = 2.8
const MAX_STEER_ANGLE       = 0.52
const STEER_RESPONSE        = 3.5
const MAX_LATERAL_GRIP      = 12

// ===== Lap timing =====
let currentLapTime = 0, bestLapTime = Infinity, previousLapTime = Infinity
let lapCount = 0, lapTimes = [], lastCrossTime = -1
let hasStartedRacing = false, checkpointIndex = 0

const FINISH_LINE_X       = trackControlPoints[0].x
const FINISH_LINE_Z_START = trackControlPoints[0].z
const FINISH_LINE_Z_END   = trackControlPoints[0].z - FINISH_LINE_LENGTH

function checkLapCrossing() {
    const dx = Math.abs(car.position.x - finishLine.position.x)
    const dz = Math.abs(car.position.z - finishLine.position.z)

    return (
        dx < TRACK_WIDTH / 2 &&
        dz < FINISH_LINE_LENGTH / 2
    )
}

// ===== Speedometer HUD =====
const speedoCvs = document.createElement('canvas')
speedoCvs.width = speedoCvs.height = 200
Object.assign(speedoCvs.style, {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    pointerEvents: 'none',
    zIndex: '100', filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' })
document.body.appendChild(speedoCvs)
const speedoCtx = speedoCvs.getContext('2d')
const SPEEDO_MAX_KMH = Math.ceil((MAX_SPEED * 3.6) / 40) * 40

function drawSpeedometer(spd) {
    const kmh = Math.abs(spd) * 3.6
    const ctx = speedoCtx, sz = 200, cx = 100, cy = 100, r = 88
    const sa = Math.PI * 0.75, sw = Math.PI * 1.5
    ctx.clearRect(0, 0, sz, sz)
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2)
    ctx.fillStyle='rgba(15,15,18,0.78)'; ctx.fill()
    ctx.lineWidth=3; ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.stroke()
    ctx.beginPath(); ctx.arc(cx,cy,r-6,sa+sw*0.85,sa+sw)
    ctx.lineWidth=5; ctx.strokeStyle='#cc2222'; ctx.stroke()
    for (let v=0; v<=SPEEDO_MAX_KMH; v+=20) {
        const a=sa+sw*(v/SPEEDO_MAX_KMH), maj=v%40===0
        ctx.beginPath()
        ctx.moveTo(cx+Math.cos(a)*(r-(maj?16:9)),cy+Math.sin(a)*(r-(maj?16:9)))
        ctx.lineTo(cx+Math.cos(a)*(r-4),cy+Math.sin(a)*(r-4))
        ctx.lineWidth=maj?2.5:1.5; ctx.strokeStyle=v>=SPEEDO_MAX_KMH*0.85?'#ff6666':'#ffffff'; ctx.stroke()
        if (maj) { ctx.fillStyle='#fff'; ctx.font='11px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(v),cx+Math.cos(a)*(r-28),cy+Math.sin(a)*(r-28)) }
    }
    const na=sa+sw*Math.min(kmh/SPEEDO_MAX_KMH,1)
    ctx.beginPath(); ctx.moveTo(cx-Math.cos(na)*10,cy-Math.sin(na)*10); ctx.lineTo(cx+Math.cos(na)*(r-20),cy+Math.sin(na)*(r-20))
    ctx.lineWidth=3; ctx.strokeStyle='#ff3333'; ctx.stroke()
    ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill()
    ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(String(Math.round(kmh)),cx,cy+r*0.45)
    ctx.font='11px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('km/h',cx,cy+r*0.45+17)
}

// ===== Lap timer HUD =====
const lapCvs = document.createElement('canvas')
lapCvs.width = 250; lapCvs.height = 162
Object.assign(lapCvs.style, {
    position: 'fixed',
    left: '20px',
    top: '20px',
    pointerEvents: 'none',
    zIndex: '100', filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' })
document.body.appendChild(lapCvs)
const lapCtx = lapCvs.getContext('2d')

function fmt(s) {
    if (s === Infinity) return '--:--.---'
    const m = Math.floor(s/60), sec = s%60
    return `${String(m).padStart(2,'0')}:${sec.toFixed(3).padStart(6,'0')}`
}

function drawLapTimer() {
    const ctx = lapCtx
    ctx.clearRect(0,0,250,162)
    ctx.fillStyle='rgba(15,15,18,0.78)'; ctx.fillRect(0,0,250,162)
    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2; ctx.strokeRect(0,0,250,162)
    const pad=15; let y=pad+15
    ctx.fillStyle='#fff'; ctx.font='bold 16px monospace'; ctx.textAlign='left'
    ctx.fillText(`LAP: ${lapCount}`,pad,y); y+=28
    ctx.font='12px monospace'
    ctx.fillStyle='#ffcc00'; ctx.textAlign='left'; ctx.fillText('Current:',pad,y)
    ctx.textAlign='right'; ctx.fillText(fmt(currentLapTime),235,y); y+=22
    ctx.fillStyle=previousLapTime!==Infinity?'#ffffff':'#666666'
    ctx.textAlign='left'; ctx.fillText('Previous:',pad,y)
    ctx.textAlign='right'; ctx.fillText(fmt(previousLapTime),235,y); y+=22
    ctx.fillStyle=bestLapTime!==Infinity?'#00ff00':'#666666'
    ctx.textAlign='left'; ctx.fillText('Best:',pad,y)
    ctx.textAlign='right'; ctx.fillText(fmt(bestLapTime),235,y)
}

function checkCheckpoint() {
    if (checkpointIndex >= checkpoints.length) return

    if (car.position.distanceTo(checkpoints[checkpointIndex]) < CHECKPOINT_RADIUS) {
        checkpointIndex++
        console.log("Checkpoint reached:", checkpointIndex)
    }
}
console.log("Reached animate()");
// ===== Animate =====
function animate() {
    requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 1/30)

    // Acceleration / braking
    const speedRatio = Math.min(Math.abs(speed) / MAX_SPEED, 1)
    if (keys['w']) speed += ACCEL * (1 - speedRatio * ACCEL_HIGH_SPEED_FALLOFF) * dt
    if (keys['s']) speed -= BRAKE * dt
    speed = Math.max(-MAX_SPEED * REVERSE_SPEED_RATIO, Math.min(MAX_SPEED, speed))
    speed *= Math.pow(FRICTION, dt)

    // Steering
    let steerTarget = 0
    if (keys['a']) steerTarget += MAX_STEER_ANGLE
    if (keys['d']) steerTarget -= MAX_STEER_ANGLE
    const sd = steerTarget - steerAngle
    steerAngle += Math.sign(sd) * Math.min(Math.abs(sd), STEER_RESPONSE * dt)
    const hrRaw = (speed / WHEELBASE) * Math.tan(steerAngle)
    const maxHR = MAX_LATERAL_GRIP / Math.max(Math.abs(speed), 0.5)
    heading += Math.sign(hrRaw) * Math.min(Math.abs(hrRaw), maxHR) * dt

    // Drift / traction
    const fat = 1 - Math.pow(1 - TRACTION * (1 - speedRatio * 0.5), dt * 60)
    let ad = Math.atan2(Math.sin(heading - velocityAngle), Math.cos(heading - velocityAngle))
    velocityAngle += ad * fat

    // Move
    car.rotation.y = heading
    car.frontLeftPivot.rotation.y  = steerAngle
    car.frontRightPivot.rotation.y = steerAngle
    car.position.x += Math.sin(velocityAngle) * speed * dt
    car.position.z += Math.cos(velocityAngle) * speed * dt

    // Wall collision
    const fr = getNearestTrackFrame(car.position)
    const toCar = new THREE.Vector3(car.position.x - fr.current.x, 0, car.position.z - fr.current.z)
    const lat = toCar.dot(fr.perpendicular)
    if (Math.abs(lat) > MAX_LATERAL_OFFSET) {
        const along = toCar.dot(fr.direction)
        const fix = new THREE.Vector3().copy(fr.current)
            .addScaledVector(fr.direction, along)
            .addScaledVector(fr.perpendicular, Math.sign(lat) * MAX_LATERAL_OFFSET)
        car.position.x = fix.x
        car.position.z = fix.z
        speed *= Math.pow(WALL_SCRUB_FACTOR, dt)
    }

    // Lap timing
    if (hasStartedRacing) currentLapTime += dt
    checkCheckpoint()
    const onFL = checkLapCrossing()
    if (onFL && Math.abs(speed) > 2 && (!hasStartedRacing || checkpointIndex === checkpoints.length)) {
        if (lastCrossTime === -1 || clock.getElapsedTime() - lastCrossTime > 5) {
            if (hasStartedRacing) {
                lapCount++
                if (currentLapTime < bestLapTime) bestLapTime = currentLapTime
                previousLapTime = currentLapTime
                lapTimes.push(currentLapTime)
                currentLapTime = 0; checkpointIndex = 0
            } else {
                hasStartedRacing = true; checkpointIndex = 0
            }
            lastCrossTime = clock.getElapsedTime()
        }
    }

    // Camera
    if (speed < -2) reverseTarget = 1
    else if (speed > 2) reverseTarget = 0
    reverseBlend += (reverseTarget - reverseBlend) * (1 - Math.exp(-5 * dt))
    const cd = 3 + speedRatio * 0.8, rh = heading + Math.PI
    desiredCameraPos.set(
        THREE.MathUtils.lerp(car.position.x-Math.sin(heading)*cd, car.position.x-Math.sin(rh)*cd, reverseBlend),
        car.position.y + 3.5,
        THREE.MathUtils.lerp(car.position.z-Math.cos(heading)*cd, car.position.z-Math.cos(rh)*cd, reverseBlend)
    )
    camera.position.lerp(desiredCameraPos, 1 - Math.exp(-(6 + speedRatio*6) * dt))
    camera.lookAt(
        THREE.MathUtils.lerp(car.position.x+Math.sin(heading)*3, car.position.x+Math.sin(rh)*3, reverseBlend),
        car.position.y + 1.5,
        THREE.MathUtils.lerp(car.position.z+Math.cos(heading)*3, car.position.z+Math.cos(rh)*3, reverseBlend)
    )

    renderer.render(scene, camera)
    drawSpeedometer(speed)
    drawLapTimer()
}

animate()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
   
})

window.getLapTimes = () => lapTimes
window.exportLapData = () => ({
    lapCount,
    bestLapTime: fmt(bestLapTime),
    allLaps: lapTimes.map(fmt),
    timestamp: new Date().toISOString()
})