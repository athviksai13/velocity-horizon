import './style.css'
import * as THREE from 'three'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87CEEB)

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
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

// Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x228B22 })
)
ground.rotation.x = -Math.PI / 2
scene.add(ground)

// Road
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 500),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
)
road.rotation.x = -Math.PI / 2
road.position.y = 0.01
scene.add(road)

// ===== Lane markings =====
// Solid white edge lines run the full length of the road, one on each side.
// They're static since the road itself is static — no need to recycle these.
const edgeLineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })

const leftEdgeLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 500),
    edgeLineMaterial
)
leftEdgeLine.rotation.x = -Math.PI / 2
leftEdgeLine.position.set(-9, 0.02, 0)
scene.add(leftEdgeLine)

const rightEdgeLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 500),
    edgeLineMaterial
)
rightEdgeLine.rotation.x = -Math.PI / 2
rightEdgeLine.position.set(9, 0.02, 0)
scene.add(rightEdgeLine)

// ===== 4-lane layout =====
// Road spans x = -9 to x = 9 (18 units), split into 4 lanes of 4.5 units each.
// Lanes 1-2 (left side, negative x) = oncoming traffic, driving toward the player.
// Lanes 3-4 (right side, positive x) = same-direction traffic, driving with the player.
// LANE_X gives the center x-position of each lane, used by both lane markings and traffic spawning.
const LANE_WIDTH = 4.5
const LANE_X = [
    -LANE_WIDTH * 1.5, // lane 0: far-left, oncoming
    -LANE_WIDTH * 0.5, // lane 1: near-left, oncoming
    LANE_WIDTH * 0.5,  // lane 2: near-right, same direction as player
    LANE_WIDTH * 1.5   // lane 3: far-right, same direction as player
]

// Dashed lane dividers at each boundary between lanes: -9, -4.5, 0, 4.5, 9.
// The two edge lines above already cover -9 and 9, so we only need dashes
// at -4.5 (between oncoming lanes) and 0 (center divider, oncoming vs same-direction)
// and 4.5 (between same-direction lanes).
const DIVIDER_X_POSITIONS = [-4.5, 0, 4.5]

const laneMarkings = []
const DASH_LENGTH = 4
const DASH_GAP = 4
const DASH_SPACING = DASH_LENGTH + DASH_GAP
const DASH_COUNT = 60 // enough dashes to cover the visible road ahead/behind

DIVIDER_X_POSITIONS.forEach((xPos) => {

    for (let i = 0; i < DASH_COUNT; i++) {

        const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, DASH_LENGTH),
            edgeLineMaterial
        )

        dash.rotation.x = -Math.PI / 2
        dash.position.set(xPos, 0.02, i * DASH_SPACING - (DASH_COUNT * DASH_SPACING) / 2)

        scene.add(dash)
        laneMarkings.push(dash)
    }

})

// Buildings
for (let i = 0; i < 100; i++) {

    const height = Math.random() * 20 + 5

    const building = new THREE.Mesh(
        new THREE.BoxGeometry(8, height, 8),
        new THREE.MeshStandardMaterial({
            color: Math.random() * 0xffffff
        })
    )

    building.position.set(
        (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 40),
        height / 2,
        Math.random() * 400 - 200
    )

    scene.add(building)
}

// ===== Trees =====
// Each tree is a Group (trunk + foliage) so it can be positioned as one unit.
// Trees sit in the gap between the road edge (x = ±9) and the nearest
// building (x = ±15), so they read as a planted median/sidewalk strip
// rather than overlapping the city blocks.
// Unlike buildings, trees RECYCLE like traffic — they always appear ahead
// of the player no matter how far they drive, since that was the call made
// for this pass. (Buildings stay static/finite, so far enough down the road
// you'll see trees lining a strip with no buildings behind them — a known
// tradeoff from mixing an infinite system with a finite one.)
const trees = []
const TREES_PER_SIDE = 40
const TREE_Z_RANGE = 400 // spread trees across a 400-unit window, matches traffic/building scale
const TREE_RECYCLE_AHEAD = 100
const TREE_RECYCLE_BEHIND = 200

function createTree() {

    const tree = new THREE.Group()

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b4423 })
    )
    trunk.position.y = 1.5
    tree.add(trunk)

    const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x2d6a2d })
    )
    foliage.position.y = 4.5
    tree.add(foliage)

    return tree
}

;[-1, 1].forEach((side) => {

    for (let i = 0; i < TREES_PER_SIDE; i++) {

        const tree = createTree()

        // x: just outside the road edge, with a little random depth (10 to 13)
        // so the tree line isn't perfectly ruler-straight.
        const xPos = side * (10 + Math.random() * 3)

        tree.position.set(
            xPos,
            0,
            Math.random() * TREE_Z_RANGE - TREE_Z_RANGE / 2
        )

        scene.add(tree)
        trees.push(tree)
    }

})

// Car
const car = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1, 4),
    new THREE.MeshStandardMaterial({
        color: 0xff0000
    })
)

car.position.y = 0.5
scene.add(car)

// Controls
const keys = {}

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true
})

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false
})

// ===== Movement state =====
// speed: how fast the car is going (along its velocityAngle)
// heading: the direction the car MESH is pointing (changes with steering input)
// velocityAngle: the direction the car is ACTUALLY traveling
// When heading and velocityAngle differ, the car is drifting/sliding.
let speed = 0
let heading = 0
let velocityAngle = 0

// Tunable constants — adjust these to change the "feel"
const MAX_SPEED = 1.2
const ACCEL = 0.02
const BRAKE = 0.03
const FRICTION = 0.985
const MIN_STEER_SPEED = 0.05   // below this, steering input does nothing
const STEER_RATE = 0.035       // how fast heading turns at low/mid speed
const HIGH_SPEED_STEER_FALLOFF = 0.5 // reduces steering rate at top speed (0-1)
const TRACTION = 0.06          // how quickly velocityAngle catches up to heading
                                // LOWER = more drift/slide, HIGHER = more grip

// ===== Traffic =====
// Each car is assigned to one of the 4 lanes defined by LANE_X above.
// Lanes 0-1 (negative x, oncoming) drive toward the player: positive z direction,
//   so their position.z DECREASES over time as they approach (since player drives
//   in -z), and they're rotated 180° (Math.PI) so their front faces the player.
// Lanes 2-3 (positive x, same direction) drive with the player: position.z
//   increases over time, same as before, no extra rotation needed.
const traffic = []
const TRAFFIC_PER_LANE = 6

LANE_X.forEach((laneCenterX, laneIndex) => {

    const isOncoming = laneIndex < 2 // lanes 0 and 1 are oncoming

    for (let i = 0; i < TRAFFIC_PER_LANE; i++) {

        const t = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 4),
            new THREE.MeshStandardMaterial({
                color: isOncoming ? 0xff8800 : 0x0000ff // orange = oncoming, blue = same direction
            })
        )

        // Small random offset within the lane so cars don't look perfectly uniform,
        // but stay well within the 4.5-unit lane width (car is 2 units wide).
        t.position.set(
            laneCenterX + (Math.random() - 0.5) * 1.5,
            0.5,
            Math.random() * 400 - 200
        )

        // Oncoming cars face the opposite way (toward the player) since they're
        // visually driving "up" the screen instead of "down" it.
        t.rotation.y = isOncoming ? Math.PI : 0

        // Each car stores its own direction and a slightly randomized speed,
        // so traffic doesn't all move in perfect lockstep.
        t.userData.direction = isOncoming ? -1 : 1
        t.userData.speed = 0.15 + Math.random() * 0.15

        scene.add(t)
        traffic.push(t)
    }

})

function animate() {

    requestAnimationFrame(animate)

    // ---- Acceleration / braking ----
    if (keys['w']) speed += ACCEL
    if (keys['s']) speed -= BRAKE

    speed = Math.max(-MAX_SPEED * 0.6, Math.min(MAX_SPEED, speed))

    // ---- Friction ----
    speed *= FRICTION

    // ---- Speed-gated steering ----
    // Only allow steering once above MIN_STEER_SPEED.
    // Steering rate falls off slightly as you approach top speed,
    // which feels more controlled (Forza-like) at high speed.
    const speedRatio = Math.min(Math.abs(speed) / MAX_SPEED, 1)
    const currentSteerRate = STEER_RATE * (1 - speedRatio * HIGH_SPEED_STEER_FALLOFF)

    // When reversing, steering direction flips — same as a real car.
    // Turning the wheel "right" while backing up swings the rear left,
    // which reads as the car curving the opposite way to forward driving.
    const steerSign = speed >= 0 ? 1 : -1

    if (Math.abs(speed) > MIN_STEER_SPEED) {
        if (keys['a']) heading += currentSteerRate * steerSign
        if (keys['d']) heading -= currentSteerRate * steerSign
    }

    // ---- Drift: velocityAngle gradually catches up to heading ----
    // TRACTION controls how "sticky" the tires are.
    // Lower traction at higher speed = easier to break into a drift.
    const speedBasedTraction = TRACTION * (1 - speedRatio * 0.5)

    let angleDiff = heading - velocityAngle
    // Normalize to -PI..PI so it always turns the short way
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
    velocityAngle += angleDiff * speedBasedTraction

    // ---- Apply rotation and movement ----
    // Car mesh always points along "heading" (where the driver is steering)
    car.rotation.y = heading

    // But the car actually MOVES along "velocityAngle" (where momentum carries it)
    car.position.x -= Math.sin(velocityAngle) * speed
    car.position.z -= Math.cos(velocityAngle) * speed

    // ---- Move traffic ----
    // Same-direction cars (direction = 1) move like the player, increasing z.
    // Oncoming cars (direction = -1) move the opposite way, decreasing z,
    // so they appear to drive toward and then past the player.
    traffic.forEach((t) => {

        t.position.z += t.userData.speed * t.userData.direction

        if (t.userData.direction === 1) {
            // Same-direction: recycle behind the player once too far ahead
            if (t.position.z > car.position.z + 100) {
                t.position.z = car.position.z - 150
            }
        } else {
            // Oncoming: recycle ahead of the player once too far behind
            if (t.position.z < car.position.z - 100) {
                t.position.z = car.position.z + 150
            }
        }

    })

    // ---- Recycle lane markings ----
    // Same trick as traffic: once a dash falls too far behind the car,
    // jump it to the front of the line so dashes always extend ahead.
    laneMarkings.forEach((dash) => {

        if (dash.position.z > car.position.z + 100) {
            dash.position.z -= DASH_COUNT * DASH_SPACING
        }

        if (dash.position.z < car.position.z - 200) {
            dash.position.z += DASH_COUNT * DASH_SPACING
        }

    })

    // ---- Recycle trees ----
    // Trees don't move on their own, but they get repositioned once the
    // player drives far enough that they'd be left behind or not yet visible.
    // The jump distance matches the trigger window (AHEAD + BEHIND) so a
    // recycled tree lands exactly back at the opposite edge of visibility,
    // rather than overshooting into empty space.
    const TREE_RECYCLE_DISTANCE = TREE_RECYCLE_AHEAD + TREE_RECYCLE_BEHIND

    trees.forEach((tree) => {

        if (tree.position.z > car.position.z + TREE_RECYCLE_AHEAD) {
            tree.position.z -= TREE_RECYCLE_DISTANCE
        }

        if (tree.position.z < car.position.z - TREE_RECYCLE_BEHIND) {
            tree.position.z += TREE_RECYCLE_DISTANCE
        }

    })

    // ---- Camera behind car ----
    // Camera follows based on heading (where car is pointing),
    // not velocityAngle, so the view stays stable even while drifting.
    const targetX = car.position.x + Math.sin(heading) * 10
    const targetY = 5
    const targetZ = car.position.z + Math.cos(heading) * 10

    camera.position.x += (targetX - camera.position.x) * 0.1
    camera.position.y += (targetY - camera.position.y) * 0.1
    camera.position.z += (targetZ - camera.position.z) * 0.1

    camera.lookAt(
        car.position.x,
        car.position.y + 1,
        car.position.z
    )

    renderer.render(scene, camera)
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