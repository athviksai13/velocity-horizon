import './style.css'
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87CEEB)
scene.fog = new THREE.Fog(0x87CEEB, 400, 2800)

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    3000
)

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Lights
const sun = new THREE.DirectionalLight(0xffffff, 3)
sun.position.set(20, 30, 20)
scene.add(sun)

scene.add(new THREE.AmbientLight(0xffffff, 1))

// ===== Track =====
const TRACK_WIDTH = 12

const trackControlPoints = [
    new THREE.Vector3(-240, 0, 0),      // 0: start/finish
    new THREE.Vector3(-240, 0, -480),   // 1
    new THREE.Vector3(-240, 0, -960),   // 2
    new THREE.Vector3(-160, 0, -1248),  // 3
    new THREE.Vector3(80, 0, -1408),    // 4
    new THREE.Vector3(400, 0, -1408),   // 5: hairpin
    new THREE.Vector3(640, 0, -1280),   // 6
    new THREE.Vector3(672, 0, -992),    // 7
    new THREE.Vector3(560, 0, -736),    // 8
    new THREE.Vector3(320, 0, -608),    // 9
    new THREE.Vector3(240, 0, -288),    // 10
    new THREE.Vector3(160, 0, 80),      // 11: top of loop
    new THREE.Vector3(-80, 0, 240)      // 12: back toward start
]

const trackCurve = new THREE.CatmullRomCurve3(trackControlPoints, true, 'catmullrom', 0.5)

const TRACK_SAMPLE_COUNT = 900
const rawTrackPoints = trackCurve.getPoints(TRACK_SAMPLE_COUNT)
const trackPoints = rawTrackPoints.slice(0, -1)

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
ground.position.set(
    (trackBoundsMaxX + trackBoundsMinX) / 2,
    0,
    (trackBoundsMaxZ + trackBoundsMinZ) / 2
)
ground.receiveShadow = true
scene.add(ground)

// ===== Road surface =====
function buildRoadGeometry(points, width) {
    const vertices = []
    const indices = []

    for (let i = 0; i < points.length; i++) {
        const current = points[i]
        const next = points[(i + 1) % points.length]

        const direction = new THREE.Vector3().subVectors(next, current).normalize()
        const perpendicular = new THREE.Vector3(direction.z, 0, -direction.x)

        const left = new THREE.Vector3().copy(current).addScaledVector(perpendicular, width / 2)
        const right = new THREE.Vector3().copy(current).addScaledVector(perpendicular, -width / 2)

        vertices.push(left.x, left.y, left.z)
        vertices.push(right.x, right.y, right.z)
    }

    const pointCount = points.length
    for (let i = 0; i < pointCount; i++) {
        const nextI = (i + 1) % pointCount
        const leftCurrent = i * 2
        const rightCurrent = i * 2 + 1
        const leftNext = nextI * 2
        const rightNext = nextI * 2 + 1

        indices.push(leftCurrent, rightCurrent, leftNext)
        indices.push(rightCurrent, rightNext, leftNext)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
}

const road = new THREE.Mesh(
    buildRoadGeometry(trackPoints, TRACK_WIDTH),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
)
road.position.y = 0.01
road.receiveShadow = true
scene.add(road)

// ===== Lane markings =====
function buildOffsetLineGeometry(points, offset, width) {
    const vertices = []
    const indices = []

    for (let i = 0; i < points.length; i++) {
        const current = points[i]
        const next = points[(i + 1) % points.length]

        const direction = new THREE.Vector3().subVectors(next, current).normalize()
        const perpendicular = new THREE.Vector3(direction.z, 0, -direction.x)

        const center = new THREE.Vector3().copy(current).addScaledVector(perpendicular, offset)
        const left = new THREE.Vector3().copy(center).addScaledVector(perpendicular, width / 2)
        const right = new THREE.Vector3().copy(center).addScaledVector(perpendicular, -width / 2)

        vertices.push(left.x, left.y, left.z)
        vertices.push(right.x, right.y, right.z)
    }

    const pointCount = points.length
    for (let i = 0; i < pointCount; i++) {
        const nextI = (i + 1) % pointCount
        const leftCurrent = i * 2
        const rightCurrent = i * 2 + 1
        const leftNext = nextI * 2
        const rightNext = nextI * 2 + 1

        indices.push(leftCurrent, rightCurrent, leftNext)
        indices.push(rightCurrent, rightNext, leftNext)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
}

const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })

const leftEdgeLine = new THREE.Mesh(
    buildOffsetLineGeometry(trackPoints, TRACK_WIDTH / 2 - 0.15, 0.3),
    lineMaterial
)
leftEdgeLine.position.y = 0.02
scene.add(leftEdgeLine)

const rightEdgeLine = new THREE.Mesh(
    buildOffsetLineGeometry(trackPoints, -TRACK_WIDTH / 2 + 0.15, 0.3),
    lineMaterial
)
rightEdgeLine.position.y = 0.02
scene.add(rightEdgeLine)

// Dashed center line
const laneMarkings = []
const DASH_SEGMENT_LENGTH = 8
const DASH_GAP_LENGTH = 8

for (let i = 0; i < trackPoints.length; i += DASH_SEGMENT_LENGTH + DASH_GAP_LENGTH) {
    const dashEnd = Math.min(i + DASH_SEGMENT_LENGTH, trackPoints.length)
    const dashPoints = trackPoints.slice(i, dashEnd + 1)

    if (dashPoints.length < 2) continue

    const dash = new THREE.Mesh(
        buildOffsetLineGeometry(dashPoints, 0, 0.3),
        lineMaterial
    )
    dash.position.y = 0.02
    scene.add(dash)
    laneMarkings.push(dash)
}

// ===== Barriers =====
const BARRIER_HEIGHT = 0.8
const BARRIER_THICKNESS = 0.3
const BARRIER_INSET = 0.05

function buildBarrierGeometry(points, side) {
    const vertices = []
    const indices = []

    const offset = side * (TRACK_WIDTH / 2 + BARRIER_INSET)

    for (let i = 0; i < points.length; i++) {
        const current = points[i]
        const next = points[(i + 1) % points.length]

        const direction = new THREE.Vector3().subVectors(next, current).normalize()
        const perpendicular = new THREE.Vector3(direction.z, 0, -direction.x)

        const base = new THREE.Vector3().copy(current).addScaledVector(perpendicular, offset)

        const bottomInner = base.clone()
        const bottomOuter = base.clone().addScaledVector(perpendicular, side * BARRIER_THICKNESS)
        const topInner = base.clone().setY(BARRIER_HEIGHT)
        const topOuter = bottomOuter.clone().setY(BARRIER_HEIGHT)

        vertices.push(bottomInner.x, bottomInner.y, bottomInner.z)
        vertices.push(bottomOuter.x, bottomOuter.y, bottomOuter.z)
        vertices.push(topInner.x, topInner.y, topInner.z)
        vertices.push(topOuter.x, topOuter.y, topOuter.z)
    }

    const pointCount = points.length
    for (let i = 0; i < pointCount; i++) {
        const nextI = (i + 1) % pointCount
        const base = i * 4
        const nextBase = nextI * 4

        indices.push(base, base + 2, nextBase)
        indices.push(base + 2, nextBase + 2, nextBase)

        indices.push(base + 1, nextBase + 1, base + 3)
        indices.push(nextBase + 1, nextBase + 3, base + 3)

        indices.push(base + 2, base + 3, nextBase + 2)
        indices.push(base + 3, nextBase + 3, nextBase + 2)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
}

const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0xcc2222 })

const leftBarrier = new THREE.Mesh(buildBarrierGeometry(trackPoints, -1), barrierMaterial)
leftBarrier.castShadow = true
leftBarrier.receiveShadow = true
scene.add(leftBarrier)

const rightBarrier = new THREE.Mesh(buildBarrierGeometry(trackPoints, 1), barrierMaterial)
rightBarrier.castShadow = true
rightBarrier.receiveShadow = true
scene.add(rightBarrier)

// ===== Finish line =====
function createCheckerTexture(cols, rows) {
    const CELL_PIXELS = 32
    const canvas = document.createElement('canvas')
    canvas.width = cols * CELL_PIXELS
    canvas.height = rows * CELL_PIXELS

    const ctx = canvas.getContext('2d')
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#101010'
            ctx.fillRect(c * CELL_PIXELS, r * CELL_PIXELS, CELL_PIXELS, CELL_PIXELS)
        }
    }

    return new THREE.CanvasTexture(canvas)
}

const FINISH_LINE_LENGTH = 6
const FINISH_LINE_COLUMNS = Math.max(4, Math.round(TRACK_WIDTH / 1.5))

const finishLine = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_WIDTH, FINISH_LINE_LENGTH),
    new THREE.MeshStandardMaterial({ map: createCheckerTexture(FINISH_LINE_COLUMNS, 2) })
)
finishLine.rotation.x = -Math.PI / 2
finishLine.position.set(trackControlPoints[0].x, 0.03, trackControlPoints[0].z)
scene.add(finishLine)

// ===== Trees =====
// Built as two InstancedMeshes (trunks, foliage) instead of ~1,200 individual
// Group/Mesh/Material instances. The original loop created a brand-new
// geometry AND a brand-new material for every single tree, which meant
// 2,400+ separate draw calls every frame just for trees. That draw-call
// count is almost certainly the real source of the "stutter" — it makes
// frame time inconsistent, which then feeds into the camera instability
// fixed below. Instancing collapses it down to 2 draw calls total.
const TREE_MIN_OFFSET = TRACK_WIDTH / 2 + BARRIER_THICKNESS + 8
const TREE_MAX_OFFSET = TRACK_WIDTH / 2 + BARRIER_THICKNESS + 30
const TREES_PER_TRACK_POINT = 2
const TREE_SAMPLE_STRIDE = 3

const treeTrunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 6)
const treeFoliageGeometry = new THREE.ConeGeometry(1.8, 4, 8)
const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4423 })
const treeFoliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d6a2d })

const treeTransforms = []

for (let i = 0; i < trackPoints.length; i += TREE_SAMPLE_STRIDE) {
    const current = trackPoints[i]
    const next = trackPoints[(i + 1) % trackPoints.length]

    const direction = new THREE.Vector3().subVectors(next, current).normalize()
    const perpendicular = new THREE.Vector3(direction.z, 0, -direction.x)

    ;[-1, 1].forEach((side) => {
        for (let j = 0; j < TREES_PER_TRACK_POINT; j++) {
            const offsetDistance = side * (TREE_MIN_OFFSET + Math.random() * (TREE_MAX_OFFSET - TREE_MIN_OFFSET))
            const position = new THREE.Vector3().copy(current).addScaledVector(perpendicular, offsetDistance)

            const jitter = (Math.random() - 0.5) * TREE_SAMPLE_STRIDE * 2
            position.addScaledVector(direction, jitter)

            treeTransforms.push({
                x: position.x,
                z: position.z,
                rotationY: Math.random() * Math.PI * 2,
                scale: 0.8 + Math.random() * 0.5
            })
        }
    })
}

const treeTrunkMesh = new THREE.InstancedMesh(treeTrunkGeometry, treeTrunkMaterial, treeTransforms.length)
const treeFoliageMesh = new THREE.InstancedMesh(treeFoliageGeometry, treeFoliageMaterial, treeTransforms.length)

const treeDummy = new THREE.Object3D()
treeTransforms.forEach((t, i) => {
    treeDummy.position.set(t.x, 1.5 * t.scale, t.z)
    treeDummy.rotation.y = t.rotationY
    treeDummy.scale.setScalar(t.scale)
    treeDummy.updateMatrix()
    treeTrunkMesh.setMatrixAt(i, treeDummy.matrix)

    treeDummy.position.set(t.x, 4.5 * t.scale, t.z)
    treeDummy.updateMatrix()
    treeFoliageMesh.setMatrixAt(i, treeDummy.matrix)
})

treeTrunkMesh.instanceMatrix.needsUpdate = true
treeFoliageMesh.instanceMatrix.needsUpdate = true

scene.add(treeTrunkMesh, treeFoliageMesh)

// ===== Car =====
// Low-poly "GTA: San Andreas" PS2-era look. The previous version stacked
// a flat box (body) + a smaller flat box (cabin) — that's what reads as
// "boxes": a box has no hood slope, no windshield rake, no roof curve, so
// no lighting setup can make it look like a car. The fix isn't reflections
// or higher-res materials, it's the SHAPE. Below, the whole body is ONE
// sculpted silhouette (front bumper -> hood -> windshield -> roof -> rear
// window -> trunk -> rear bumper), extruded into 3D, with a slight inward
// taper above the beltline so the cabin reads narrower than the body —
// the same "tumblehome" real cars (and the GTA models) have. Material
// stays a plain flat-shaded MeshStandardMaterial, no env maps, no extra
// shininess, so it keeps the chunky PS2 look — only the shape changed.
const CAR_WIDTH = 1.8
const CAR_LENGTH = 4.2
const CAR_BELT_HEIGHT = 0.85   // height where the cabin starts pulling inward
const CAR_ROOF_HEIGHT = 1.30   // top of the roof
const CAR_TUMBLEHOME = 0.78    // 1 = vertical sides, lower = more inward lean

// One continuous side-view outline of the car (x = front/back, y = height),
// traced once around: rocker (flat bottom) -> front bumper -> hood ->
// windshield -> roof -> rear window -> trunk -> rear bumper -> back to
// rocker. Tuned by hand for CAR_LENGTH = 4.2 / CAR_WIDTH = 1.8.
const CAR_BODY_PROFILE = [
    [-2.05, 0.15],  // rear bumper, bottom
    [ 2.00, 0.15],  // front bumper, bottom (flat rocker/sill line)
    [ 2.10, 0.35],  // front bumper, leading face
    [ 1.90, 0.55],  // top of front bumper / front edge of hood
    [ 1.60, 0.62],  // hood
    [ 0.90, 0.85],  // cowl, base of windshield
    [ 0.40, 1.30],  // windshield top / front of roof
    [-0.60, 1.30],  // rear of roof
    [-1.20, 0.95],  // base of rear window
    [-1.60, 0.65],  // trunk lid
    [-1.90, 0.45],  // top of rear bumper
    [-2.10, 0.30],  // rear bumper, trailing face
]

function buildCarBodyGeometry() {
    // splineThru (not lineTo) is what actually makes this curved. lineTo
    // connects the profile points with straight segments, which is why it
    // came out "carved"/faceted — sharp corner at every control point.
    // splineThru runs a smooth curve through the same points instead, so
    // the hood, windshield, roof and trunk blend into each other like an
    // actual car body rather than meeting at creases.
    const points = CAR_BODY_PROFILE.map(p => new THREE.Vector2(p[0], p[1]))
    const shape = new THREE.Shape()
    shape.moveTo(points[0].x, points[0].y)
    shape.splineThru(points.slice(1).concat([points[0]]))

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: CAR_WIDTH,
        curveSegments: 28,   // more samples along the spline = smoother curve, less faceting
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2,
        steps: 1
    })

    // ExtrudeGeometry puts the profile on local X/Y and extrudes along
    // local Z. We want length along world Z (forward) and width along
    // world X, so rotate 90° and re-center on the width axis.
    geometry.rotateY(-Math.PI / 2)
    geometry.translate(CAR_WIDTH / 2, 0, 0)

    // Tumblehome: above the beltline, pull vertices in toward the
    // centerline so the cabin reads narrower than the body — like a real
    // unibody car — instead of one constant-width slab all the way up.
    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (y > CAR_BELT_HEIGHT) {
            const t = Math.min((y - CAR_BELT_HEIGHT) / (CAR_ROOF_HEIGHT - CAR_BELT_HEIGHT), 1)
            const factor = THREE.MathUtils.lerp(1, CAR_TUMBLEHOME, t)
            pos.setX(i, pos.getX(i) * factor)
        }
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()

    return geometry
}

function createCar(bodyColor) {
    const carGroup = new THREE.Group()

    // side: THREE.DoubleSide is a safety net for the sculpted body — an
    // extruded-then-rotated-then-tapered mesh can end up with normals
    // that aren't all consistently outward, and a single-sided material
    // would make panels vanish from some angles instead of just looking
    // a little off.
    // Lower roughness + a touch of metalness gives the paint a real
    // highlight where the sun light hits it, instead of the flat, no-shine
    // "matte plastic" look of the default material (roughness 1, metalness
    // 0). This is still just the one directional light responding to the
    // material — no env map, no extra reflections — so it stays in the
    // chunky low-poly register, it just actually reads as painted metal.
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: bodyColor,
        flatShading: true,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.45
    })
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x161616, flatShading: true })
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 })

    // ---- Body shell (sculpted silhouette, not stacked boxes) ----
    const body = new THREE.Mesh(buildCarBodyGeometry(), bodyMaterial)
    body.castShadow = true
    body.receiveShadow = true
    carGroup.add(body)

    // ---- Windshield & rear window (flush against the sloped panels) ----
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.68), glassMaterial)
    windshield.position.set(0, 1.07, 0.65)
    windshield.rotation.x = -1.1
    carGroup.add(windshield)

    const rearWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.55), glassMaterial)
    rearWindow.position.set(0, 1.12, -0.9)
    rearWindow.rotation.x = 0.8
    carGroup.add(rearWindow)

    // ---- Bumpers (dark trim, sits just proud of the body) ----
    const frontBumper = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_WIDTH + 0.06, 0.28, 0.2),
        trimMaterial
    )
    frontBumper.position.set(0, 0.32, 2.0)
    carGroup.add(frontBumper)

    const rearBumper = new THREE.Mesh(
        new THREE.BoxGeometry(CAR_WIDTH + 0.06, 0.28, 0.2),
        trimMaterial
    )
    rearBumper.position.set(0, 0.32, -2.0)
    carGroup.add(rearBumper)

    // ---- Headlights / taillights (simple square insets) ----
    const headlightMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, emissive: 0x888866 })
    ;[-1, 1].forEach((side) => {
        const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.06), headlightMaterial)
        headlight.position.set(side * 0.62, 0.55, 1.95)
        carGroup.add(headlight)
    })

    const taillightMaterial = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0x550000 })
    ;[-1, 1].forEach((side) => {
        const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.06), taillightMaterial)
        taillight.position.set(side * 0.62, 0.45, -1.95)
        carGroup.add(taillight)
    })

    // ---- Mirrors ----
    ;[-1, 1].forEach((side) => {
        const mirror = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.12, 0.22),
            bodyMaterial
        )
        mirror.position.set(side * (CAR_WIDTH / 2 + 0.05), 0.95, 0.8)
        carGroup.add(mirror)
    })

    // ---- Wheels ----
    const wheelGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.27, 12)
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })

    function createWheelMesh() {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
        wheel.rotation.z = Math.PI / 2
        wheel.castShadow = true
        return wheel
    }

    const frontLeftPivot = new THREE.Group()
    frontLeftPivot.position.set(-0.9, 0.36, 1.4)
    frontLeftPivot.add(createWheelMesh())
    carGroup.add(frontLeftPivot)

    const frontRightPivot = new THREE.Group()
    frontRightPivot.position.set(0.9, 0.36, 1.4)
    frontRightPivot.add(createWheelMesh())
    carGroup.add(frontRightPivot)

    const rearLeftWheel = createWheelMesh()
    rearLeftWheel.position.set(-0.9, 0.36, -1.4)
    carGroup.add(rearLeftWheel)

    const rearRightWheel = createWheelMesh()
    rearRightWheel.position.set(0.9, 0.36, -1.4)
    carGroup.add(rearRightWheel)

    carGroup.frontLeftPivot = frontLeftPivot
    carGroup.frontRightPivot = frontRightPivot

    return carGroup
}

const car = createCar(0xff0000)
car.position.set(trackControlPoints[0].x, 0, trackControlPoints[0].z-15)
scene.add(car)

camera.position.set(trackControlPoints[0].x, 5, trackControlPoints[0].z - 10)

// ===== Track boundary collision =====
function getNearestTrackFrame(position) {
    let nearestIndex = 0
    let nearestDistSq = Infinity

    for (let i = 0; i < trackPoints.length; i++) {
        const dx = position.x - trackPoints[i].x
        const dz = position.z - trackPoints[i].z
        const distSq = dx * dx + dz * dz

        if (distSq < nearestDistSq) {
            nearestDistSq = distSq
            nearestIndex = i
        }
    }

    const current = trackPoints[nearestIndex]
    const next = trackPoints[(nearestIndex + 1) % trackPoints.length]
    const direction = new THREE.Vector3().subVectors(next, current).normalize()
    const perpendicular = new THREE.Vector3(direction.z, 0, -direction.x)

    return { current, direction, perpendicular }
}

const CAR_HALF_WIDTH = CAR_WIDTH / 2
const MAX_LATERAL_OFFSET = TRACK_WIDTH / 2 - CAR_HALF_WIDTH

const WALL_SCRUB_FACTOR = 0.4

// ===== Controls =====
const keys = {}

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true
})

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false
})

// ===== Movement state =====
let speed = 0
let heading = 0
let velocityAngle = 0
let steerAngle = 0
const cameraOffset = new THREE.Vector3(0, 5, -10)

let desiredCameraPos = new THREE.Vector3()

// Drives the camera swinging around to the front of the car while
// reversing — see the CAMERA FOLLOW section in animate() for details.
let reverseBlend = 0
let reverseTarget = 0

const clock = new THREE.Clock()

// ===== Constants =====
const MAX_SPEED = 78
const REVERSE_SPEED_RATIO = 0.2
const ACCEL = 9
const ACCEL_HIGH_SPEED_FALLOFF = 0.8
const BRAKE = 13
const FRICTION = 0.96
const TRACTION = 0.06

const WHEELBASE = 2.8
const MAX_STEER_ANGLE = 0.52
const STEER_RESPONSE = 3.5
// The bicycle model above gives a FIXED turn radius at full lock
// (WHEELBASE / tan(MAX_STEER_ANGLE) ≈ 4.9m) no matter the speed — fine at
// parking-lot speed, but at 280 km/h that radius implies turning over
// 900°/second, an instant spin. Real tires can only generate so much
// sideways grip; this caps the turn rate so it can never imply more
// lateral g-force than a grippy sport tire can actually produce, the same
// way BRAKE above is expressed as a g-force limit rather than unbounded.
const MAX_LATERAL_GRIP = 12 // m/s² (~1.2g) — caps how sharply the car can turn at speed

// ===== LAP TIMING SYSTEM =====
let currentLapTime = 0
let bestLapTime = Infinity
let lapCount = 0
let lapTimes = []
let lastCrossTime = -1
let hasStartedRacing = false
let lastFinishLineZ = null

// Finish line boundaries for lap detection
const FINISH_LINE_X = trackControlPoints[0].x
const FINISH_LINE_Z_START = trackControlPoints[0].z
const FINISH_LINE_Z_END = trackControlPoints[0].z - FINISH_LINE_LENGTH

function checkLapCrossing() {
    const carX = car.position.x
    const carZ = car.position.z
    
    // Check if car is near the finish line X coordinate (within road width)
    const xDistance = Math.abs(carX - FINISH_LINE_X)
    if (xDistance > TRACK_WIDTH / 2 + 2) return false
    
    // Check if car is between finish line Z bounds
    const zMin = Math.min(FINISH_LINE_Z_START, FINISH_LINE_Z_END)
    const zMax = Math.max(FINISH_LINE_Z_START, FINISH_LINE_Z_END)
    
    return carZ >= zMin && carZ <= zMax
}

// ===== Speedometer HUD =====
const speedometerCanvas = document.createElement('canvas')
speedometerCanvas.width = 200
speedometerCanvas.height = 200
speedometerCanvas.style.position = 'fixed'
speedometerCanvas.style.right = '20px'
speedometerCanvas.style.bottom = '20px'
speedometerCanvas.style.pointerEvents = 'none'
speedometerCanvas.style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))'
document.body.appendChild(speedometerCanvas)

const speedoCtx = speedometerCanvas.getContext('2d')
const SPEEDO_MAX_KMH = Math.ceil((MAX_SPEED * 3.6) / 40) * 40

function drawSpeedometer(speedMps) {
    const kmh = Math.abs(speedMps) * 3.6
    const ctx = speedoCtx
    const size = speedometerCanvas.width
    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 12

    const startAngle = Math.PI * 0.75
    const sweep = Math.PI * 1.5
    const endAngle = startAngle + sweep

    ctx.clearRect(0, 0, size, size)

    // Dial face
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(15, 15, 18, 0.78)'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.stroke()

    // Redline zone
    ctx.beginPath()
    ctx.arc(cx, cy, radius - 6, startAngle + sweep * 0.85, endAngle)
    ctx.lineWidth = 5
    ctx.strokeStyle = '#cc2222'
    ctx.stroke()

    // Tick marks
    const TICK_STEP = 20
    const LABEL_STEP = 40

    for (let v = 0; v <= SPEEDO_MAX_KMH; v += TICK_STEP) {
        const t = v / SPEEDO_MAX_KMH
        const angle = startAngle + sweep * t
        const isMajor = v % LABEL_STEP === 0

        const outer = radius - 4
        const inner = radius - (isMajor ? 16 : 9)

        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
        ctx.lineWidth = isMajor ? 2.5 : 1.5
        ctx.strokeStyle = v >= SPEEDO_MAX_KMH * 0.85 ? '#ff6666' : '#ffffff'
        ctx.stroke()

        if (isMajor) {
            const lx = cx + Math.cos(angle) * (radius - 28)
            const ly = cy + Math.sin(angle) * (radius - 28)
            ctx.fillStyle = '#ffffff'
            ctx.font = '11px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(String(v), lx, ly)
        }
    }

    // Needle
    const needleAngle = startAngle + sweep * Math.min(kmh / SPEEDO_MAX_KMH, 1)
    const needleLength = radius - 20

    ctx.beginPath()
    ctx.moveTo(cx - Math.cos(needleAngle) * 10, cy - Math.sin(needleAngle) * 10)
    ctx.lineTo(cx + Math.cos(needleAngle) * needleLength, cy + Math.sin(needleAngle) * needleLength)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ff3333'
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // Digital readout
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(Math.round(kmh)), cx, cy + radius * 0.45)

    ctx.font = '11px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.fillText('km/h', cx, cy + radius * 0.45 + 17)
}

// ===== Lap Timer HUD =====
const lapTimerCanvas = document.createElement('canvas')
lapTimerCanvas.width = 250
lapTimerCanvas.height = 150
lapTimerCanvas.style.position = 'fixed'
lapTimerCanvas.style.left = '20px'
lapTimerCanvas.style.top = '20px'
lapTimerCanvas.style.pointerEvents = 'none'
lapTimerCanvas.style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))'
document.body.appendChild(lapTimerCanvas)

const lapCtx = lapTimerCanvas.getContext('2d')

function formatTime(seconds) {
    if (seconds === Infinity) return '--:--.---'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`
}

function drawLapTimer() {
    const ctx = lapCtx
    ctx.clearRect(0, 0, lapTimerCanvas.width, lapTimerCanvas.height)
    
    // Background
    ctx.fillStyle = 'rgba(15, 15, 18, 0.78)'
    ctx.fillRect(0, 0, lapTimerCanvas.width, lapTimerCanvas.height)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, lapTimerCanvas.width, lapTimerCanvas.height)
    
    const padding = 15
    let y = padding + 15
    
    // Lap count
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`LAP: ${lapCount}`, padding, y)
    y += 25
    
    // Current lap time
    ctx.font = '12px monospace'
    ctx.fillStyle = '#ffcc00'
    ctx.fillText('Current:', padding, y)
    ctx.textAlign = 'right'
    ctx.fillText(formatTime(currentLapTime), lapTimerCanvas.width - padding, y)
    y += 20
    
    // Best lap time
    ctx.fillStyle = bestLapTime !== Infinity ? '#00ff00' : '#666666'
    ctx.fillText('Best:    ', padding, y)
    ctx.textAlign = 'right'
    ctx.fillText(formatTime(bestLapTime), lapTimerCanvas.width - padding, y)
}

function animate() {
    requestAnimationFrame(animate)

    // Clamp deltaTime so a dropped/hitched frame (tab switch, GC pause,
    // a heavy frame) can't inject a huge dt spike into the physics/camera
    // integration below — this is part of what was causing the camera to
    // visibly jump/stutter rather than smoothly slow down.
    const deltaTime = Math.min(clock.getDelta(), 1 / 30)

    // ---- Acceleration / braking ----
    const speedRatio = Math.min(Math.abs(speed) / MAX_SPEED, 1)
    const currentAccel = ACCEL * (1 - speedRatio * ACCEL_HIGH_SPEED_FALLOFF)

    if (keys['w']) speed += currentAccel * deltaTime
    if (keys['s']) speed -= BRAKE * deltaTime

    speed = Math.max(-MAX_SPEED * REVERSE_SPEED_RATIO, Math.min(MAX_SPEED, speed))

    // ---- Friction / drag ----
    speed *= Math.pow(FRICTION, deltaTime)

    // ---- Steering (bicycle model) ----
    let steerTarget = 0
    if (keys['a']) steerTarget += MAX_STEER_ANGLE
    if (keys['d']) steerTarget -= MAX_STEER_ANGLE

    const steerDiff = steerTarget - steerAngle
    const steerStep = Math.sign(steerDiff) * Math.min(Math.abs(steerDiff), STEER_RESPONSE * deltaTime)
    steerAngle += steerStep

    // Raw bicycle-model turn rate from wheelbase geometry and steer angle.
    const headingRateRaw = (speed / WHEELBASE) * Math.tan(steerAngle)

    // Clamp by how much sideways grip the tires can actually generate:
    // lateral accel = speed * headingRate, so the max allowed headingRate
    // at the current speed is MAX_LATERAL_GRIP / speed. At low/parking
    // speed this limit is huge and never binds, so tight low-speed
    // maneuvering still comes straight from the bicycle model above; only
    // at real speed does it kick in and hold the turn to a realistic rate.
    // The 0.5 floor on speed just avoids dividing by ~0 near a standstill.
    const maxHeadingRate = MAX_LATERAL_GRIP / Math.max(Math.abs(speed), 0.5)
    const headingRate = Math.sign(headingRateRaw) * Math.min(Math.abs(headingRateRaw), maxHeadingRate)
    heading += headingRate * deltaTime

    // ---- Drift: velocityAngle gradually catches up to heading ----
    const speedBasedTraction = TRACTION * (1 - speedRatio * 0.5)
    const frameAdjustedTraction = 1 - Math.pow(1 - speedBasedTraction, deltaTime * 60)

    let angleDiff = heading - velocityAngle
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
    velocityAngle += angleDiff * frameAdjustedTraction
    // ---- Apply rotation and movement ----
    car.rotation.y = heading

    car.frontLeftPivot.rotation.y = steerAngle
    car.frontRightPivot.rotation.y = steerAngle

    // FIX: Changed from -= to += to move car forward correctly
    car.position.x += Math.sin(velocityAngle) * speed * deltaTime
    car.position.z += Math.cos(velocityAngle) * speed * deltaTime

    // ---- Track boundary collision ----
    const frame = getNearestTrackFrame(car.position)
    const toCar = new THREE.Vector3(
        car.position.x - frame.current.x,
        0,
        car.position.z - frame.current.z
    )
    const lateralOffset = toCar.dot(frame.perpendicular)

    if (Math.abs(lateralOffset) > MAX_LATERAL_OFFSET) {
        const alongOffset = toCar.dot(frame.direction)
        const clampedLateral = Math.sign(lateralOffset) * MAX_LATERAL_OFFSET

        const corrected = new THREE.Vector3()
            .copy(frame.current)
            .addScaledVector(frame.direction, alongOffset)
            .addScaledVector(frame.perpendicular, clampedLateral)

        car.position.x = corrected.x
        car.position.z = corrected.z

        speed *= Math.pow(WALL_SCRUB_FACTOR, deltaTime)
    }

    // ---- LAP TIMING ----
    if (hasStartedRacing) {
        currentLapTime += deltaTime
    }

    // Check for lap crossing
    const onFinishLine = checkLapCrossing()
    
    if (onFinishLine && Math.abs(speed) > 2) { // Must be moving reasonably fast
        if (lastCrossTime === -1 || clock.getElapsedTime() - lastCrossTime > 5) { // Prevent double-counting (5 second buffer)
            if (hasStartedRacing) {
                // Completed a lap
                lapCount++
                if (currentLapTime < bestLapTime) {
                    bestLapTime = currentLapTime
                }
                lapTimes.push(currentLapTime)
                console.log(`LAP ${lapCount} COMPLETE: ${formatTime(currentLapTime)}`)
                currentLapTime = 0
            } else {
                // First crossing - start the race
                hasStartedRacing = true
                console.log('RACE STARTED!')
            }
            lastCrossTime = clock.getElapsedTime()
        }
    }

    // ----- CAMERA FOLLOW -----
    // Frame-rate independent exponential smoothing instead of the old
    // velocity/spring integration. The old version added a velocity each
    // frame proportional to stiffness * deltaTime (stiffness up to 100) —
    // once deltaTime wasn't tiny (a slow frame, or just running at 30fps
    // instead of 60fps), that overshoots. On top of that, a *second*,
    // unscaled `lerp(desiredCameraPos, 0.02)` ran every frame regardless of
    // deltaTime, fighting the spring. That combination — an unstable spring
    // plus a frame-rate-dependent correction layered on top — is what reads
    // as stutter. This single formula converges smoothly to the target at
    // any frame rate, with no overshoot and nothing fighting it.
    //
    // Reverse handling: `heading` is just which way the car is POINTED, and
    // it doesn't flip when you reverse — so without this, the camera would
    // stay parked behind the nose staring forward while you back up *toward*
    // it, never showing you what's behind you. `reverseBlend` smoothly swings
    // the camera around to the front of the car and flips the look direction
    // whenever speed is clearly negative, so it actually shows the direction
    // you're travelling. A small dead zone around zero speed stops it from
    // flapping back and forth every time you're stopped or coasting.
    if (speed < -2) reverseTarget = 1
    else if (speed > 2) reverseTarget = 0
    reverseBlend += (reverseTarget - reverseBlend) * (1 - Math.exp(-5 * deltaTime))

    const cameraDistance = 3 + speedRatio * 0.8
    const reverseHeading = heading + Math.PI

    const forwardCamX = car.position.x - Math.sin(heading) * cameraDistance
    const forwardCamZ = car.position.z - Math.cos(heading) * cameraDistance
    const reverseCamX = car.position.x - Math.sin(reverseHeading) * cameraDistance
    const reverseCamZ = car.position.z - Math.cos(reverseHeading) * cameraDistance

    desiredCameraPos.set(
        THREE.MathUtils.lerp(forwardCamX, reverseCamX, reverseBlend),
        car.position.y + 3.5,
        THREE.MathUtils.lerp(forwardCamZ, reverseCamZ, reverseBlend)
    )

    // Higher followRate = camera catches up to the target faster.
    const followRate = 6 + speedRatio * 6
    const followAmount = 1 - Math.exp(-followRate * deltaTime)

    camera.position.lerp(desiredCameraPos, followAmount)

    const forwardLookX = car.position.x + Math.sin(heading) * 3
    const forwardLookZ = car.position.z + Math.cos(heading) * 3
    const reverseLookX = car.position.x + Math.sin(reverseHeading) * 3
    const reverseLookZ = car.position.z + Math.cos(reverseHeading) * 3

    camera.lookAt(
        THREE.MathUtils.lerp(forwardLookX, reverseLookX, reverseBlend),
        car.position.y + 1.5,
        THREE.MathUtils.lerp(forwardLookZ, reverseLookZ, reverseBlend)
    )

    renderer.render(scene, camera)

    drawSpeedometer(speed)
    drawLapTimer()
}

animate()

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    )
})

// Export lap times for GitHub submission
window.getLapTimes = () => lapTimes
window.exportLapData = () => {
    return {
        lapCount,
        bestLapTime: formatTime(bestLapTime),
        allLaps: lapTimes.map(formatTime),
        timestamp: new Date().toISOString()
    }
}